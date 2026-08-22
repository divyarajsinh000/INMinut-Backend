const express = require("express");
const {
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
  reorderCountries,
  reorderStates,
  reorderCities,
} = require("../controllers/locationController");
const { auth, authorize } = require("../middlewares/auth");
const { scrapingLimiter } = require("../middlewares/security");
const { botProtection } = require("../middlewares/botProtection");

const router = express.Router();

router.get("/countries", botProtection, scrapingLimiter, getCountries);
router.put("/countries/reorder", auth, authorize("super-admin"), reorderCountries);
router.post("/countries", auth, authorize("super-admin"), createCountry);
router.put("/countries/:id", auth, authorize("super-admin"), updateCountry);
router.delete("/countries/:id", auth, authorize("super-admin"), deleteCountry);

router.get("/states", botProtection, scrapingLimiter, getStates);
router.put("/states/reorder", auth, authorize("super-admin"), reorderStates);
router.post("/states", auth, authorize("super-admin"), createState);
router.put("/states/:id", auth, authorize("super-admin"), updateState);
router.delete("/states/:id", auth, authorize("super-admin"), deleteState);

router.get("/cities", botProtection, scrapingLimiter, getCities);
router.put("/cities/reorder", auth, authorize("super-admin"), reorderCities);
router.post("/cities", auth, authorize("super-admin"), createCity);
router.put("/cities/:id", auth, authorize("super-admin"), updateCity);
router.delete("/cities/:id", auth, authorize("super-admin"), deleteCity);

module.exports = router;
