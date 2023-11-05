import classNames from "classnames";
import warning from "../../images/warning.png";
import { getBuildingIO, getMultipliersFor, totalMultiplierFor } from "../logic/BuildingLogic";
import { Config } from "../logic/Constants";
import { GameState } from "../logic/GameState";
import { Multiplier, Tick } from "../logic/TickLogic";
import { jsxMapOf } from "../utilities/Helper";
import { L, t } from "../utilities/i18n";
import { FormatNumber } from "./HelperComponents";

export function BuildingIOTreeViewComponent({
   gameState,
   xy,
   type,
}: {
   gameState: GameState;
   xy: string;
   type: keyof Pick<Multiplier, "input" | "output">;
}) {
   const data = getBuildingIO(xy, type, { multiplier: true, capacity: true }, gameState);
   const totalMultiplier = totalMultiplierFor(xy, type, gameState);
   return (
      <ul className="tree-view">
         {jsxMapOf(data, (k, v) => {
            const resourceInStorage = gameState.tiles[xy].building?.resources[k] ?? 0;
            const showWarning =
               type === "input" &&
               Tick.current.notProducingReasons[xy] === "NotEnoughResources" &&
               resourceInStorage < v;
            return (
               <li key={k}>
                  <details>
                     <summary className="row">
                        {showWarning ? <img src={warning} style={{ margin: "0 2px 0 0" }} /> : null}
                        <div className={classNames({ f1: true, "production-warning": showWarning })}>
                           {Config.Resource[k].name()}
                        </div>
                        <div className="text-strong">
                           <FormatNumber value={v} />
                        </div>
                     </summary>
                     <ul>
                        <li className="row">
                           <div className="f1">{type === "input" ? t(L.BaseConsumption) : t(L.BaseProduction)}</div>
                           <div className="text-strong">
                              <FormatNumber value={v / totalMultiplier} />
                           </div>
                        </li>
                        <li className="row">
                           <div className="f1">
                              {type === "input" ? t(L.ConsumptionMultiplier) : t(L.ProductionMultiplier)}
                           </div>
                           <div className="text-strong">
                              x<FormatNumber value={totalMultiplier} />
                           </div>
                        </li>
                        <ul className="text-small">
                           <li className="row">
                              <div className="f1">{t(L.BaseMultiplier)}</div>
                              <div>1</div>
                           </li>
                           {getMultipliersFor(xy, gameState).map((m, idx) => {
                              if (!m[type]) {
                                 return null;
                              }
                              return (
                                 <li key={idx} className="row">
                                    <div className="f1">{m.source}</div>
                                    <div>{m[type]}</div>
                                 </li>
                              );
                           })}
                        </ul>
                     </ul>
                  </details>
               </li>
            );
         })}
      </ul>
   );
}