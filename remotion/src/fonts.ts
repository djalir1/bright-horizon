import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";

const c = loadCormorant("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const d = loadDmSans("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

export const SERIF = c.fontFamily;
export const SANS = d.fontFamily;