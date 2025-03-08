import Tippy from "@tippyjs/react";
import classNames from "classnames";
import type { Resource } from "../../../shared/definitions/ResourceDefinitions";
import { Config } from "../../../shared/logic/Config";
import { notifyGameStateUpdate } from "../../../shared/logic/GameStateLogic";
import { L, t } from "../../../shared/utilities/i18n";
import { useCurrentTick } from "../logic/ClientUpdate";
import { playClick } from "../visuals/Sound";
import { FormatNumber } from "./HelperComponents";
import { TableView } from "./TableView";

export let resourceWatchList: Resource[] = ["Wood", "Stone", "PlanetaryRover"];

export function toggleResourceWatch(res: Resource) {
   if (resourceWatchList.includes(res)) {
      resourceWatchList = resourceWatchList.filter((resource) => resource !== res);
   } else {
      resourceWatchList.push(res);
   }
}

export function ResourceWatchPanel(): React.ReactNode {
   const tick = useCurrentTick();

   return (
      <div className={classNames({ "resource-watch-bar window": true })}>
         <TableView
            classNames="sticky-header f1"
            header={[
               { name: "", sortable: true },
               { name: t(L.ResourceAmount), right: true, sortable: true },
               { name: "", sortable: false },
            ]}
            data={resourceWatchList}
            compareFunc={(a, b, i) => {
               switch (i) {
                  case 1:
                     return (tick.resourceAmount.get(a) ?? 0) - (tick.resourceAmount.get(b) ?? 0);
                  default: {
                     return Config.Resource[a].name().localeCompare(Config.Resource[b].name());
                  }
               }
            }}
            renderRow={(res) => {
               const r = Config.Resource[res];
               const amount = tick.resourceAmount.get(res) ?? 0;

               return (
                  <tr key={res}>
                     <td>{r.name()}</td>
                     <td className="right">
                        <FormatNumber value={amount} />
                     </td>
                     <td
                        className="pointer"
                        onClick={() => {
                           playClick();
                           toggleResourceWatch(res);
                           notifyGameStateUpdate();
                        }}
                     >
                        <Tippy content={t(L.RemoveFromResourceWatch)}>
                           <div className="m-icon small text-red pointer">delete</div>
                        </Tippy>
                     </td>
                  </tr>
               );
            }}
         />
      </div>
   );
}
