/*
 * Choices for a company's location (plan/hiring-ui HU-21), client-safe. Most companies
 * on ShipItHQ are Indian, so India and its states and union territories come first;
 * anything else is typed through the select's "Other".
 */

export const COUNTRIES = [
    "India", "United States", "United Kingdom", "Canada", "Singapore", "United Arab Emirates", "Germany",
    "Netherlands", "France", "Ireland", "Australia", "Japan", "Israel", "Sweden", "Switzerland",
] as const

export const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const
