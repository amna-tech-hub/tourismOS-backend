const cloudinary = require("../config/cloudinary.config");

class CloudinaryService {
 
  async uploadBuffer(buffer, folder = "TourismOS") {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "image",
          format: "jpg",
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}

module.exports = new CloudinaryService();