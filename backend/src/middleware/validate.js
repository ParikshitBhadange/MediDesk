const { ApiError } = require("../utils/ApiError");

// Runs a Zod schema against req.body/query/params and normalizes the parsed
// result back onto req[source], so controllers always see clean input.
function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      return next(new ApiError(400, "Validation failed", details));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
