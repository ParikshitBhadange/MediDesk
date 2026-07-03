function ok(res, data, meta) {
  return res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
}

function created(res, data) {
  return res.status(201).json({ success: true, data });
}

function noContent(res) {
  return res.status(204).send();
}

function fail(res, status, message, details) {
  return res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}

module.exports = { ok, created, noContent, fail };
