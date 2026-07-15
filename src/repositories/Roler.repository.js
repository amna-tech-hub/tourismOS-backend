const BaseRepository = require("./base/BaseRepository");
const Role = require("../models/Role.model");

class RoleRepository extends BaseRepository {
    constructor() {
        super(Role);
    }

    async findByName(name) {
        return await this.model.findOne({
            name,
            isDeleted: false,
        });
    }
}

module.exports = new RoleRepository();