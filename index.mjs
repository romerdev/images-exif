import fs from "fs/promises";
import path from "path";
import mv from "mv";
import { v4 as uuidv4 } from "uuid";
import chalk from "chalk";
import ExifImage from "exif";
import ffmpeg from "fluent-ffmpeg";
import { fileTypeFromFile } from "file-type";

const directory = process.cwd();

const mvAsync = (source, destination) =>
  new Promise((resolve, reject) => {
    mv(source, destination, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });

const ffprobeAsync = (filePath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });

const processFiles = async () => {
  try {
    const files = await fs.readdir(path.join(directory, "input"));
    await Promise.all(
      files
        .filter((file) => !file.startsWith("."))
        .map(async (file) => {
          const currentPath = path.join(directory, "input", file);
          await exportFile(currentPath);
        })
    );
  } catch (err) {
    console.error(chalk.red(`Error reading directory: ${err}`));
  }
};

const exportFile = async (currentPath) => {
  try {
    const type = await fileTypeFromFile(currentPath);
    if (type?.mime.startsWith("image")) {
      await exportMedia(currentPath, "image", `.${type.ext}`);
    } else if (type?.mime.startsWith("video")) {
      await exportMedia(currentPath, "video", `.${type.ext}`);
    } else {
      console.log(
        chalk.yellow(`Unsupported file type for file ${currentPath}`)
      );
    }
  } catch (error) {
    console.log(
      chalk.red(`Error processing file ${currentPath}: ${error.message}`)
    );
  }
};

const readExifData = (currentPath) =>
  new Promise(
    (resolve, reject) =>
      new ExifImage({ image: currentPath }, (error, result) =>
        error ? reject(error) : resolve(result)
      )
  );

const exportMedia = async (currentPath, mediaType, extension) => {
  try {
    let date;
    if (mediaType === "image") {
      date = await handleImage(currentPath);
    } else if (mediaType === "video") {
      date = await handleVideo(currentPath);
    }

    if (!date || isNaN(date)) {
      console.log(
        chalk.yellow("No created date was found or date could not be parsed.")
      );
      return;
    }

    await moveFile(currentPath, date, extension);
  } catch (error) {
    console.log(chalk.red(`Error: ${error.message}`));
  }
};

const handleImage = async (currentPath) => {
  let date = null;
  try {
    const exifData = await readExifData(currentPath);
    let dateString = exifData?.exif?.DateTimeOriginal?.replace(
      /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
      (match, year, month, day, hour, minute, second) =>
        `${year}-${month}-${day}T${hour}:${minute}:${second}`
    );
    date = new Date(dateString);
  } catch (error) {
    console.log(
      chalk.yellow(
        `Error reading Exif data from ${currentPath}: ${error.message}`
      )
    );
  }
  return date;
};

const handleVideo = async (currentPath) => {
  let date = null;
  try {
    const metadata = await ffprobeAsync(currentPath);
    date = new Date(metadata?.format?.tags?.creation_time);
  } catch (error) {
    console.log(
      chalk.yellow(
        `Error reading metadata from ${currentPath}: ${error.message}`
      )
    );
  }
  return date;
};

const moveFile = async (currentPath, date, extension) => {
  const formattedDate = formatMediaDate(
    date,
    extension.startsWith(".img") ? "image" : "video"
  );
  let destinationPath = path.join(
    directory,
    "output",
    `${formattedDate}${extension}`
  );
  if (await fileExists(destinationPath)) {
    let uniqueId;
    do {
      uniqueId = `${Date.now()}_${uuidv4()}`;
      destinationPath = path.join(
        directory,
        "output",
        `${formattedDate}_${uniqueId}${extension}`
      );
    } while (await fileExists(destinationPath));
  }
  console.log(
    chalk.blue(`Moving file from ${currentPath} to ${destinationPath}`)
  );
  await mvAsync(currentPath, destinationPath);
  if (await fileExists(destinationPath)) {
    console.log(chalk.green("Successfully moved the file!"));
  } else {
    console.log(
      chalk.red(
        `File move unsuccessful! File not found at ${destinationPath} after move operation.`
      )
    );
  }
};

const formatMediaDate = (date, mediaType) => {
  if (mediaType === "image") {
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}_${date
      .getHours()
      .toString()
      .padStart(2, "0")}-${date.getMinutes().toString().padStart(2, "0")}`;
  } else if (mediaType === "video") {
    return (
      date.toISOString().split("T")[0].replace(/:/g, "-") +
      "_" +
      date.toISOString().split("T")[1].split(".")[0].replace(/:/g, "-")
    );
  }
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      console.error(chalk.red(err));
      return false;
    }
  }
};

processFiles();
