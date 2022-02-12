const ExifImage = require("exif").ExifImage;
const fs = require("fs");
const path = require("path");
const mv = require("mv");

const files = fs.readdirSync("input/");

for (const file of files) {
  const currentPath = path.join(__dirname, "input", file);
  const extention = file.split(".").pop();

  exportImage(currentPath, extention);
}

function exportImage(currentPath, extention) {
  try {
    new ExifImage({ image: currentPath }, function (error, exifData) {
      if (error) {
        console.log("Error: " + error.message);
      } else {
        if (JSON.stringify(exifData.exif.CreateDate)) {
          const date = JSON.stringify(exifData.exif.CreateDate);
          const y = date.substring(1, 5);
          const m = date.substring(6, 8);
          const d = date.substring(9, 11);
          const h = date.substring(12, 14);
          const min = date.substring(15, 17);

          const formattedDate = `${y}-${m}-${d}_${h}-${min}`;

          let destinationPath = path.join(
            __dirname,
            "output",
            `${formattedDate}.${extention}`
          );

          // Adding random digits between 0 and 1000 when file aleardy exists
          if (checkExistance(destinationPath) === true) {
            const randomID = Math.floor(Math.random() * 1000);

            destinationPath = path.join(
              __dirname,
              "output",
              `${formattedDate}_${randomID}.${extention}`
            );
          }

          // Moving the file
          mv(currentPath, destinationPath, function (err) {
            if (err) {
              throw err;
            } else {
              console.log("Successfully moved the file!");
            }
          });
        } else {
          console.log("No created date was found.");
        }
      }
    });
  } catch (error) {
    console.log("Error: " + error.message);
  }
}

// Checking if file already exists in ouput folder
function checkExistance(file) {
  try {
    if (fs.existsSync(file)) {
      return true;
    } else {
      return;
    }
  } catch (err) {
    console.error(err);
  }
}
