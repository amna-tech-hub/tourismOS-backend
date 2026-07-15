
class BaseRepository {
  
    constructor(model) {
        this.model = model;
    }

    // find by id
  
    async findById(id, options = {}) {
        const {
            includeDeleted = false,
            populate = "",
            select = null,
        } = options;

        const filter = { _id: id };

        if (!includeDeleted) {
            filter.isDeleted = false;
        }

        return await this.model
            .findOne(filter)
            .select(select)
            .populate(populate);
    }

//    find one
    async findOne(filter = {}, options = {}) {
        const {
            includeDeleted = false,
            populate = "",
            select = null,
        } = options;

        const query = {
            ...filter,
        };

        if (!includeDeleted) {
            query.isDeleted = false;
        }

        return await this.model
            .findOne(query)
            .select(select)
            .populate(populate);
    }

//  find all 
    async findAll(filter = {}, options = {}) {
        const {
            includeDeleted = false,
            populate = "",
            select = null,
            sort = {},
            skip = 0,
            limit = 0,
        } = options;

        const query = {
            ...filter,
        };

        if (!includeDeleted) {
            query.isDeleted = false;
        }

        return await this.model
            .find(query)
            .select(select)
            .populate(populate)
            .sort(sort)
            .skip(skip)
            .limit(limit);
    }

//   create
    async create(data) {
        return await this.model.create(data);
    }

//    update
   async update(id, data) {
    return await this.model.findByIdAndUpdate(
        id,
        data,
        {
            new: true,
            runValidators: true,
        }
    );
}
//    soft del
 async softDelete(id, deletedBy = null) {
    return await this.model.findByIdAndUpdate(
        id,
        {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy,
        },
        {
            new: true,
        }
    );
}
//restore 
async restore(id) {
    return await this.model.findByIdAndUpdate(
        id,
        {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
        },
        {
            new: true,
        }
    );
}

//   hard del
    async hardDelete(id) {
        return await this.model.findByIdAndDelete(id);
    }
}

module.exports = BaseRepository;