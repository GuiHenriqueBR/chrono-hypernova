"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../utils/logger");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
    logger_1.logger.error("CRITICAL: Supabase credentials missing", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
    });
    throw new Error("Supabase URL e Key são obrigatórios");
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
