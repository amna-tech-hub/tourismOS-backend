const paginate = require("./pagination.util");

class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // ==========================================
  // SEARCH
  // ==========================================

  search(fields = []) {
    const search = this.queryString.search;

    if (search && fields.length > 0) {
      this.query = this.query.find({
        $or: fields.map((field) => ({
          [field]: {
            $regex: search,
            $options: "i",
          },
        })),
      });
    }

    return this;
  }

  // ==========================================
  // FILTER
  // ==========================================

  filter(additionalExcludedFields = []) {
    const queryObj = { ...this.queryString };

    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "search",
      "order",

      // Special filters handled manually by controllers
      "companyId",

      // Additional controller-specific filters
      ...additionalExcludedFields,
    ];

    excludedFields.forEach((field) => {
      delete queryObj[field];
    });

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(
      /\b(gte|gt|lte|lt)\b/g,
      (match) => `$${match}`
    );

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  // ==========================================
  // SORT
  // ==========================================

  sort() {
    const sortField = this.queryString.sort;

    // ==========================================
    // CUSTOM SORT OPTIONS
    // ==========================================

    if (sortField === "newest") {
      this.query = this.query.sort({
        createdAt: -1,
      });

      return this;
    }

    if (sortField === "popular") {
      this.query = this.query.sort({
        ratingsAverage: -1,
        ratingsQuantity: -1,
      });

      return this;
    }

    if (sortField === "price-low") {
      this.query = this.query.sort({
        price: 1,
      });

      return this;
    }

    if (sortField === "price-high") {
      this.query = this.query.sort({
        price: -1,
      });

      return this;
    }

    // ==========================================
    // EXISTING SORT BEHAVIOR
    // ==========================================

    const field = sortField || "createdAt";

    const order =
      this.queryString.order === "asc"
        ? 1
        : -1;

    this.query = this.query.sort({
      [field]: order,
    });

    return this;
  }

  // ==========================================
  // LIMIT FIELDS
  // ==========================================

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields
        .split(",")
        .join(" ");

      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  // ==========================================
  // PAGINATION
  // ==========================================

  paginate() {
    const { skip, limit } = paginate(this.queryString);

    this.query = this.query
      .skip(skip)
      .limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;