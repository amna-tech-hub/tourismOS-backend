const cloudinary = require("../config/cloudinary.config");

class CloudinaryService {
  /**
   * Upload image buffer to Cloudinary
   */
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

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId) {
    if (!publicId) {
      throw new Error("Cloudinary public_id is required.");
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return result;
  }
}

module.exports = new CloudinaryService();