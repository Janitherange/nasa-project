function getPagination(query) {
  const page = Math.abs(query.page) || 1;
  const limit = Math.abs(query.limit) || 0;

  return {
    skip: (page - 1) * limit,
    limit: limit,
  };
}

module.exports = {
  getPagination,
};
