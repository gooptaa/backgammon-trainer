import { Checker } from "./Checker";

interface CheckerStackProps {
  centers: readonly { x: number; y: number }[];
  player: "white" | "black";
  kind: "point" | "bar" | "borne-off";
  stackPrefix: string;
}

export function CheckerStack({
  centers,
  player,
  kind,
  stackPrefix
}: CheckerStackProps): JSX.Element {
  return (
    <g>
      {centers.map((center, index) => (
        <Checker
          key={`${stackPrefix}-${index}`}
          cx={center.x}
          cy={center.y}
          player={player}
          kind={kind}
          stackIndex={index}
        />
      ))}
    </g>
  );
}
