const Country = require("../models/Country");
const State = require("../models/State");
const City = require("../models/City");

const normalizeName = (value = "") => String(value).trim();

const createCountry = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    if (!name) return res.status(400).json({ success: false, message: "Country name is required" });

    const country = await Country.create({ name, code: req.body.code || "", isActive: req.body.isActive !== false });
    return res.status(201).json({ success: true, message: "Country created", data: country });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "Country already exists" });
    console.error("Create country error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCountries = async (req, res) => {
  try {
    const query = req.query.all === "true" ? {} : { isActive: true };
    const countries = await Country.find(query).sort({ name: 1 });
    return res.json({ success: true, data: countries });
  } catch (error) {
    console.error("Get countries error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCountry = async (req, res) => {
  try {
    const payload = {};
    if (req.body.name !== undefined) payload.name = normalizeName(req.body.name);
    if (req.body.code !== undefined) payload.code = req.body.code;
    if (req.body.isActive !== undefined) payload.isActive = Boolean(req.body.isActive);
    const country = await Country.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!country) return res.status(404).json({ success: false, message: "Country not found" });
    return res.json({ success: true, message: "Country updated", data: country });
  } catch (error) {
    console.error("Update country error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const stateCount = await State.countDocuments({ country: req.params.id });
    if (stateCount > 0) return res.status(400).json({ success: false, message: "Delete states before deleting this country" });
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) return res.status(404).json({ success: false, message: "Country not found" });
    return res.json({ success: true, message: "Country deleted" });
  } catch (error) {
    console.error("Delete country error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createState = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    const { country } = req.body;
    if (!name || !country) return res.status(400).json({ success: false, message: "State name and country are required" });
    const state = await State.create({ name, country, isActive: req.body.isActive !== false });
    const populated = await State.findById(state._id).populate("country");
    return res.status(201).json({ success: true, message: "State created", data: populated });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "State already exists in this country" });
    console.error("Create state error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getStates = async (req, res) => {
  try {
    const query = req.query.all === "true" ? {} : { isActive: true };
    if (req.query.country) query.country = req.query.country;
    const states = await State.find(query).populate("country").sort({ name: 1 });
    return res.json({ success: true, data: states });
  } catch (error) {
    console.error("Get states error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateState = async (req, res) => {
  try {
    const payload = {};
    if (req.body.name !== undefined) payload.name = normalizeName(req.body.name);
    if (req.body.country !== undefined) payload.country = req.body.country;
    if (req.body.isActive !== undefined) payload.isActive = Boolean(req.body.isActive);
    const state = await State.findByIdAndUpdate(req.params.id, payload, { new: true }).populate("country");
    if (!state) return res.status(404).json({ success: false, message: "State not found" });
    return res.json({ success: true, message: "State updated", data: state });
  } catch (error) {
    console.error("Update state error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteState = async (req, res) => {
  try {
    const cityCount = await City.countDocuments({ state: req.params.id });
    if (cityCount > 0) return res.status(400).json({ success: false, message: "Delete cities before deleting this state" });
    const state = await State.findByIdAndDelete(req.params.id);
    if (!state) return res.status(404).json({ success: false, message: "State not found" });
    return res.json({ success: true, message: "State deleted" });
  } catch (error) {
    console.error("Delete state error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createCity = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    const { state, country } = req.body;
    if (!name || !state || !country) return res.status(400).json({ success: false, message: "City name, state, and country are required" });
    const city = await City.create({ name, state, country, isActive: req.body.isActive !== false });
    const populated = await City.findById(city._id).populate("state").populate("country");
    return res.status(201).json({ success: true, message: "City created", data: populated });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: "City already exists in this state" });
    console.error("Create city error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getCities = async (req, res) => {
  try {
    const query = req.query.all === "true" ? {} : { isActive: true };
    if (req.query.state) query.state = req.query.state;
    if (req.query.country) query.country = req.query.country;
    const cities = await City.find(query).populate("state").populate("country").sort({ name: 1 });
    return res.json({ success: true, data: cities });
  } catch (error) {
    console.error("Get cities error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateCity = async (req, res) => {
  try {
    const payload = {};
    if (req.body.name !== undefined) payload.name = normalizeName(req.body.name);
    if (req.body.state !== undefined) payload.state = req.body.state;
    if (req.body.country !== undefined) payload.country = req.body.country;
    if (req.body.isActive !== undefined) payload.isActive = Boolean(req.body.isActive);
    const city = await City.findByIdAndUpdate(req.params.id, payload, { new: true }).populate("state").populate("country");
    if (!city) return res.status(404).json({ success: false, message: "City not found" });
    return res.json({ success: true, message: "City updated", data: city });
  } catch (error) {
    console.error("Update city error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) return res.status(404).json({ success: false, message: "City not found" });
    return res.json({ success: true, message: "City deleted" });
  } catch (error) {
    console.error("Delete city error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createCountry,
  getCountries,
  updateCountry,
  deleteCountry,
  createState,
  getStates,
  updateState,
  deleteState,
  createCity,
  getCities,
  updateCity,
  deleteCity,
};
