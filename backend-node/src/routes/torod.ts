import { Router } from "express";

import {
  listCountries,
  listRegions,
  listCities,
  listDistricts,
  listCourierPartners,
} from "../services/torodService";
import { AppError } from "../utils/errors";

const router = Router();

router.get("/countries", async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const result = await listCountries(Number.isFinite(page) ? page : 1);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/regions", async (req, res, next) => {
  try {
    const countryId =
      typeof req.query.country_id === "string"
        ? req.query.country_id
        : typeof req.query.countryId === "string"
        ? req.query.countryId
        : undefined;
    const page = Number(req.query.page ?? 1);

    if (!countryId) {
      throw AppError.badRequest("country_id is required");
    }

    const result = await listRegions(countryId, Number.isFinite(page) ? page : 1);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/cities", async (req, res, next) => {
  try {
    const regionId =
      typeof req.query.region_id === "string"
        ? req.query.region_id
        : typeof req.query.regionId === "string"
        ? req.query.regionId
        : undefined;
    const page = Number(req.query.page ?? 1);

    if (!regionId) {
      throw AppError.badRequest("region_id is required");
    }

    const result = await listCities(regionId, Number.isFinite(page) ? page : 1);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/districts", async (req, res, next) => {
  try {
    const cityId =
      typeof req.query.cities_id === "string"
        ? req.query.cities_id
        : typeof req.query.city_id === "string"
        ? req.query.city_id
        : typeof req.query.cityId === "string"
        ? req.query.cityId
        : undefined;
    const page = Number(req.query.page ?? 1);

    if (!cityId) {
      throw AppError.badRequest("cities_id is required");
    }

    const result = await listDistricts(cityId, Number.isFinite(page) ? page : 1);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/courier-partners", async (req, res, next) => {
  try {
    const cityId =
      typeof req.query.city_id === "string"
        ? req.query.city_id
        : typeof req.query.cityId === "string"
        ? req.query.cityId
        : undefined;

    if (!cityId) {
      throw AppError.badRequest("city_id is required");
    }

    const result = await listCourierPartners(cityId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
