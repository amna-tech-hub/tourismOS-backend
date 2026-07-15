const BaseRepository = require("./base/BaseRepository");
const User = require("../models/User.model");

class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    async findByEmail(email) {
        return await this.model.findOne({
            email,
            isDeleted: false,
        });
    }
}

module.exports = new UserRepository();