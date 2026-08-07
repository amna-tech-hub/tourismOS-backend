
const paginate = (query) => {
    let page = parseInt(query.page, 10) || 1;
    let limit = parseInt(query.limit, 10) || 10;

    // Prevent invalid values
    page = page < 1 ? 1 : page;

    // Maximum records per request
    limit = limit < 1 ? 10 : limit;
    limit = limit > 100 ? 100 : limit;

    const skip = (page - 1) * limit;

   return {
    page,
    limit,
    skip,
    sortBy: query.sortBy || "createdAt",
    order: query.order === "asc" ? 1 : -1,
};
};

module.exports = paginate;