/**
 * Recoil Direction arc visualization.
 * Ported from DIM: src/app/item-popup/RecoilStat.tsx
 */

interface RecoilStatProps {
    value: number;
}

/**
 * Calculate recoil direction from -100 (left) to +100 (right), 0 = straight up.
 * See: https://imgur.com/LKwWUNV
 */
function recoilDirection(value: number): number {
    return Math.sin((value + 5) * (Math.PI / 10)) * (100 - value);
}

// How much to bias the direction towards center
const verticalScale = 0.8;
// Maximum spread angle (degrees)
const maxSpread = 180;

/**
 * SVG arc showing recoil direction and spread.
 * Higher values = tighter spread, more vertical.
 */
export default function RecoilStat({ value }: RecoilStatProps) {
    const direction = recoilDirection(value) * verticalScale * (Math.PI / 180);
    const x = Math.sin(direction);
    const y = Math.cos(direction);

    const spread =
        ((100 - value) / 100) *
        (maxSpread / 2) *
        (Math.PI / 180) *
        Math.sign(direction);

    const xSpreadMore = Math.sin(direction + spread);
    const ySpreadMore = Math.cos(direction + spread);
    const xSpreadLess = Math.sin(direction - spread);
    const ySpreadLess = Math.cos(direction - spread);

    return (
        <svg height="14" viewBox="0 0 2 1" style={{ marginLeft: 4 }}>
            <circle r={1} cx={1} cy={1} fill="#333" />
            {value >= 95 ? (
                <line x1={1 - x} y1={1 + y} x2={1 + x} y2={1 - y} stroke="white" strokeWidth="0.1" />
            ) : (
                <path
                    d={`M1,1 L${1 + xSpreadMore},${1 - ySpreadMore} A1,1 0 0,${direction < 0 ? '1' : '0'} ${1 + xSpreadLess},${1 - ySpreadLess} Z`}
                    fill="#FFF"
                />
            )}
        </svg>
    );
}
