import type { ReactElement } from "react";
import logoColor from "../../../design-system/assets/logos/auxis-logo-color.png";
import logoReversed from "../../../design-system/assets/logos/auxis-logo-reversed.png";

/**
 * The official Auxis logo as a faint watermark in the bottom-right of the viewport, behind the content (Ion,
 * 2026-11-12). Colour logo on the light theme, reversed on the dark one (design-system/assets/logos/README.md:
 * never recolour the mark; only its opacity changes). Decorative: hidden from assistive tech, no pointer events.
 */
export function LogoWatermark(): ReactElement {
    return (
        <div className="ax-watermark" aria-hidden="true">
            <img className="ax-watermark-light" src={logoColor} alt="" />
            <img className="ax-watermark-dark" src={logoReversed} alt="" />
        </div>
    );
}
