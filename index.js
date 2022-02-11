const ExifImage = require("exif").ExifImage;
const fs = require("fs");

const files = fs.readdirSync("input/");

for (const file of files) {
  getImageDate(`input/${file}`);
}

function getImageDate(image) {
  try {
    new ExifImage({ image: image }, function (error, exifData) {
      if (error) {
        console.log("Error: " + error.message);
      } else {
        console.log(exifData);
      }
    });
  } catch (error) {
    console.log("Error: " + error.message);
  }
}
