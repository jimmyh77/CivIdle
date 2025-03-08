import Tippy from "@tippyjs/react";
import classNames from "classnames";
import { NoStorage, type Resource } from "../../../shared/definitions/ResourceDefinitions";
import { Config } from "../../../shared/logic/Config";
import { notifyGameOptionsUpdate, notifyGameStateUpdate } from "../../../shared/logic/GameStateLogic";
import { keysOf, tileToPoint, type Tile } from "../../../shared/utilities/Helper";
import { L, t } from "../../../shared/utilities/i18n";
import { useGameOptions, useGameState } from "../Global";
import { WorldScene } from "../scenes/WorldScene";
import { jsxMapOf } from "../utilities/Helper";
import { Singleton } from "../utilities/Singleton";
import type { IBuildingComponentProps } from "./BuildingPage";
import { ColorPicker } from "./ColorPicker";
import { resourceWatchList, toggleResourceWatch } from "./ResourceWatchPanel";
import { playClick } from "../visuals/Sound";

export function BuildingResourceWatch({ gameState, xy }: IBuildingComponentProps): React.ReactNode {
   const tile = gameState.tiles.get(xy);
   const building = tile?.building;
   if (!building) {
      return null;
   }
   const gameOptions = useGameOptions();
   const def = Config.Building[building.type];
   const buildingColor = gameOptions.buildingColors[building.type] ?? "#ffffff";
   return (
      <fieldset>
         <legend>{t(L.ResourceWatch)}</legend>
         {keysOf(building.resources)
            .sort((a, b) => {
               return building.resources[b]! - building.resources[a]!;
            })
            .map((res) => {
               return (
                  <div
                     className="row pointer"
                     key={res}
                     onClick={() => {
                        playClick();
                        toggleResourceWatch(res);
                        notifyGameStateUpdate();
                     }}
                  >
                     <div className="f1">{Config.Resource[res].name()}</div>
                     <div>
                        {resourceWatchList.includes(res) ? (
                           <div className="m-icon text-green">toggle_on</div>
                        ) : (
                           <div className="m-icon text-grey">toggle_off</div>
                        )}
                     </div>
                  </div>
               );
            })}
      </fieldset>
   );
}
