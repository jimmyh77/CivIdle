import classNames from "classnames";
import { useState } from "react";
import type { IBuildingDefinition } from "../../../shared/definitions/BuildingDefinitions";
import { NoPrice, NoStorage, type Resource } from "../../../shared/definitions/ResourceDefinitions";
import { IOCalculation } from "../../../shared/logic/BuildingLogic";
import { Config } from "../../../shared/logic/Config";
import {
   getBuildingIO,
   getResourceIO,
   getXyBuildings,
   unlockedResources,
} from "../../../shared/logic/IntraTickCache";
import { NotProducingReason, Tick } from "../../../shared/logic/TickLogic";
import {
   forEach,
   formatHMS,
   hasFlag,
   keysOf,
   numberToRoman,
   type Tile,
} from "../../../shared/utilities/Helper";
import { L, t } from "../../../shared/utilities/i18n";
import type { PartialSet } from "../../../shared/utilities/TypeDefinitions";
import { WorldScene } from "../scenes/WorldScene";
import { Singleton } from "../utilities/Singleton";
import type { IBuildingComponentProps } from "./BuildingPage";
import { BuildingFilter, Filter } from "./FilterComponent";
import { hideModal } from "./GlobalModal";
import { FormatNumber } from "./HelperComponents";
import { TableView } from "./TableView";

const resourceTabSortingState = { column: 0, asc: true };
let savedResourceTierFilter = BuildingFilter.None;
let savedResourceSearch = "";

export function ResourceOverviewModal({ gameState }: IBuildingComponentProps): React.ReactNode {
   const [expandedRow, setExpandedRow] = useState<Resource | null>();
   const [resourceTierFilter, _setResourceTierFilter] = useState<BuildingFilter>(savedResourceTierFilter);
   const setResourceTierFilter = (newFilter: BuildingFilter) => {
      _setResourceTierFilter(newFilter);
      savedResourceTierFilter = newFilter;
   };
   const unlockedResourcesList: PartialSet<Resource> = unlockedResources(gameState);
   const [search, setSearch] = useState<string>(savedResourceSearch);
   const io = getResourceIO(gameState);
   const inputs = io.actualInput;
   const outputs = io.actualOutput;

   const highlightResourcesUsed = (
      res: Resource,
      type: keyof Pick<IBuildingDefinition, "input" | "output">,
   ) => {
      const inputOutputTiles: Tile[] = [];

      gameState.tiles.forEach((tile, xy) => {
         const inputOutput = getBuildingIO(
            xy,
            type,
            IOCalculation.Multiplier | IOCalculation.Capacity,
            gameState,
         );
         forEach(inputOutput, (r, amount) => {
            if (res === r) {
               inputOutputTiles.push(tile.tile);
            }
         });
      });
      Singleton().sceneManager.getCurrent(WorldScene)?.drawSelection(null, inputOutputTiles);
   };

   return (
      <div className="window" style={{ width: "50vw" }}>
         <div className="title-bar">
            <div className="title-bar-text">{t(L.ResourceOverview)}</div>
            <div className="title-bar-controls">
               <button onClick={hideModal} aria-label="Close"></button>
            </div>
         </div>
         <div className="window-body">
            <div className="row mb5">
               <input
                  type="text"
                  style={{ flex: 1 }}
                  value={savedResourceSearch}
                  placeholder={t(L.StatisticsResourcesSearchText)}
                  onChange={(e) => {
                     savedResourceSearch = e.target.value;
                     setSearch(savedResourceSearch);
                  }}
               />
            </div>
            <div className="row mb5">
               {[1, 2, 3, 4, 5, 6, 7, 8].map((tier) => {
                  return (
                     <Filter
                        key={tier}
                        filter={resourceTierFilter}
                        current={1 << tier}
                        savedFilter={savedResourceTierFilter}
                        onFilterChange={setResourceTierFilter}
                     >
                        {numberToRoman(tier)}
                     </Filter>
                  );
               })}
            </div>
            <TableView
               classNames="sticky-header f1 resource-overview"
               header={[
                  { name: "", sortable: true },
                  { name: t(L.ResourceOverviewValue), right: true, sortable: true },
                  { name: t(L.ResourceOverviewAmount), right: true, sortable: true },
                  { name: t(L.ResourceOverviewProduction), right: true, sortable: true },
                  { name: t(L.ResourceOverviewConsumption), right: true, sortable: true },
                  { name: t(L.ResourceOverviewDeficit), right: true, sortable: true },
                  { name: t(L.ResourceOverviewRunOut), right: true, sortable: true },
               ]}
               sortingState={resourceTabSortingState}
               data={keysOf(unlockedResourcesList).filter((v) => {
                  let filter = (savedResourceTierFilter & 0x0fffffff) === 0;
                  for (let i = 0; i < 12; i++) {
                     if (hasFlag(savedResourceTierFilter, 1 << i)) {
                        filter ||= Config.ResourceTier[v] === i;
                     }
                  }

                  const s = search.toLowerCase();
                  return filter && Config.Resource[v].name().toLowerCase().includes(s);
               })}
               compareFunc={(a, b, i) => {
                  switch (i) {
                     case 1:
                        return (Config.ResourcePrice[a] ?? 0) - (Config.ResourcePrice[b] ?? 0);
                     case 2:
                        return (
                           (Tick.current.resourceAmount.get(a) ?? 0) -
                           (Tick.current.resourceAmount.get(b) ?? 0)
                        );
                     case 3:
                        return (outputs.get(a) ?? 0) - (outputs.get(b) ?? 0);
                     case 4:
                        return (inputs.get(a) ?? 0) - (inputs.get(b) ?? 0);
                     case 5:
                        return (
                           (outputs.get(a) ?? 0) -
                           (inputs.get(a) ?? 0) -
                           ((outputs.get(b) ?? 0) - (inputs.get(b) ?? 0))
                        );
                     case 6: {
                        const deficitA = (outputs.get(a) ?? 0) - (inputs.get(a) ?? 0);
                        const deficitB = (outputs.get(b) ?? 0) - (inputs.get(b) ?? 0);
                        const timeLeftA =
                           deficitA < 0
                              ? (Tick.current.resourceAmount.get(a) ?? 0) / deficitA
                              : Number.NEGATIVE_INFINITY;
                        const timeLeftB =
                           deficitB < 0
                              ? (Tick.current.resourceAmount.get(b) ?? 0) / deficitB
                              : Number.NEGATIVE_INFINITY;
                        return timeLeftA !== timeLeftB
                           ? timeLeftB - timeLeftA
                           : Config.Resource[a].name().localeCompare(Config.Resource[b].name());
                     }
                     default:
                        return Config.Resource[a].name().localeCompare(Config.Resource[b].name());
                  }
               }}
               renderRow={(res) => {
                  const r = Config.Resource[res];
                  if (NoPrice[res] || NoStorage[res]) {
                     return null;
                  }
                  const output = outputs.get(res) ?? 0;
                  const input = inputs.get(res) ?? 0;
                  const deficit = output - input;
                  const amount = Tick.current.resourceAmount.get(res) ?? 0;
                  const timeLeft =
                     deficit < 0 ? Math.abs((1000 * amount) / deficit) : Number.POSITIVE_INFINITY;

                  let extraRowContent = null;
                  if (expandedRow) {
                     const buildings = getXyBuildings(gameState);
                     extraRowContent = (
                        <tr>
                           <td colSpan={7}>
                              <TableView
                                 classNames="sticky-header f1"
                                 header={[
                                    { name: "", sortable: true },
                                    { name: "Level", sortable: true },
                                    { name: "Production", sortable: true },
                                    { name: "Consumption", sortable: true },
                                    { name: "State", sortable: true },
                                 ]}
                                 data={Array.from(buildings).filter((value) => {
                                    const b = value[1];
                                    return (
                                       expandedRow in Config.Building[b.type].output ||
                                       expandedRow in Config.Building[b.type].input
                                    );
                                 })}
                                 renderRow={(value) => {
                                    const xy = value[0];
                                    const b = value[1];
                                    const buildingOutputs = getBuildingIO(
                                       xy,
                                       "output",
                                       IOCalculation.Multiplier | IOCalculation.Capacity,
                                       gameState,
                                    );
                                    const buildingInputs = getBuildingIO(
                                       xy,
                                       "input",
                                       IOCalculation.Multiplier | IOCalculation.Capacity,
                                       gameState,
                                    );
                                    let building_state = "Active";
                                    if (b.capacity === 0) {
                                       building_state = "Shutdown";
                                    } else if (
                                       Tick.current.notProducingReasons.get(xy) ===
                                       NotProducingReason.StorageFull
                                    ) {
                                       building_state = "Storage Full";
                                    } else if (
                                       Tick.current.notProducingReasons.get(xy) === NotProducingReason.NoPower
                                    ) {
                                       building_state = "No Power";
                                    } else if (
                                       Tick.current.notProducingReasons.get(xy) ===
                                       NotProducingReason.NotOnDeposit
                                    ) {
                                       building_state = "No Deposit";
                                    } else if (
                                       Tick.current.notProducingReasons.get(xy) ===
                                       NotProducingReason.NotEnoughWorkers
                                    ) {
                                       building_state = "Not Enough Workers";
                                    } else if (
                                       Tick.current.notProducingReasons.get(xy) ===
                                       NotProducingReason.NotEnoughResources
                                    ) {
                                       building_state = "Not Enough Resources";
                                    }
                                    return (
                                       <tr>
                                          <td>{Config.Building[b.type].name()}</td>
                                          <td>{b.level}</td>
                                          <td>{buildingOutputs[expandedRow] ?? 0}</td>
                                          <td>{buildingInputs[expandedRow] ?? 0}</td>
                                          <td>{building_state}</td>
                                       </tr>
                                    );
                                 }}
                                 compareFunc={(a, b, i) => {
                                    switch (i) {
                                       default:
                                          return Config.Building[a[1].type]
                                             .name()
                                             .localeCompare(Config.Building[b[1].type].name());
                                    }
                                 }}
                              />
                           </td>
                        </tr>
                     );
                  }
                  return (
                     <>
                        <tr key={res}>
                           <td>
                              <div className="row">
                                 <div
                                    className="m-icon small pointer"
                                    onClick={() => {
                                       if (expandedRow === res) {
                                          setExpandedRow(null);
                                       } else {
                                          setExpandedRow(res);
                                       }
                                    }}
                                 >
                                    {expandedRow === res ? <>indeterminate_check_box</> : <>add_box</>}
                                 </div>
                                 <div>{r.name()}</div>
                              </div>
                           </td>
                           <td className="right">
                              <FormatNumber value={Config.ResourcePrice[res]} />
                           </td>
                           <td className="right">
                              <FormatNumber value={amount} />
                           </td>
                           <td
                              className="right pointer"
                              onClick={() => highlightResourcesUsed(res, "output")}
                           >
                              <FormatNumber value={output} />
                           </td>
                           <td className="right pointer" onClick={() => highlightResourcesUsed(res, "input")}>
                              <FormatNumber value={input} />
                           </td>
                           <td>
                              <div className={classNames({ "text-right": true, "text-red": deficit < 0 })}>
                                 <FormatNumber value={deficit} />
                              </div>
                           </td>
                           <td
                              className={classNames({
                                 "text-red": deficit < 0,
                                 "text-right text-small": true,
                              })}
                           >
                              {formatHMS(timeLeft)}
                           </td>
                        </tr>
                        {expandedRow === res ? extraRowContent : null}
                     </>
                  );
               }}
            />
         </div>
      </div>
   );
}
