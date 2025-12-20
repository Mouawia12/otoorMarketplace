import { Router } from "express";

import {
  getCities,
  getPointsByCity,
  searchNearbyPoints,
} from "../services/redboxService";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/redbox/cities", async (req, res, next) => {
  try {
    const country =
      typeof req.query.country === "string" ? req.query.country : undefined;
    const result = await getCities(country);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/redbox/points", async (req, res, next) => {
  try {
    const cityCode =
      typeof req.query.city_code === "string"
        ? req.query.city_code
        : typeof req.query.cityCode === "string"
        ? req.query.cityCode
        : undefined;

    if (!cityCode) {
      throw AppError.badRequest("city_code is required");
    }

    const result = await getPointsByCity(cityCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/redbox/nearby", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = req.query.radius ? Number(req.query.radius) : undefined;
    const type =
      typeof req.query.type === "string" ? req.query.type : undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw AppError.badRequest("lat and lng are required");
    }

    const result = await searchNearbyPoints({
      lat,
      lng,
      ...(radius !== undefined ? { radius } : {}),
      ...(type !== undefined ? { type } : {}),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
