import Tippy from "@tippyjs/react";
import classNames from "classnames";
import { useState } from "react";
import {
   NoPrice,
   NoStorage,
   ResourceDefinitions,
   type Resource,
} from "../../../shared/definitions/ResourceDefinitions";
import {
   getResourceImportCapacity,
   getStorageFor,
   totalMultiplierFor,
} from "../../../shared/logic/BuildingLogic";
import { Config } from "../../../shared/logic/Config";
import { TRADE_CANCEL_REFUND_PERCENT } from "../../../shared/logic/Constants";
import { notifyGameStateUpdate } from "../../../shared/logic/GameStateLogic";
import { getBuildingsByType, unlockedResources } from "../../../shared/logic/IntraTickCache";
import {
   getBuyAmountRange,
   getTradePercentage,
   type IClientAddTradeRequest,
} from "../../../shared/logic/PlayerTradeLogic";
import type { IResourceImport, IResourceImportBuildingData } from "../../../shared/logic/Tile";
import {
   CURRENCY_PERCENT_EPSILON,
   forEach,
   formatPercent,
   keysOf,
   mathSign,
   safeAdd,
   safeParseInt,
   type Tile,
} from "../../../shared/utilities/Helper";
import type { Tabulate } from "../../../shared/utilities/TypeDefinitions";
import { L, t } from "../../../shared/utilities/i18n";
import { AccountLevelImages, AccountLevelNames } from "../logic/AccountLevel";
import { client, useTrades, useUser } from "../rpc/RPCClient";
import { LookAtMode, WorldScene } from "../scenes/WorldScene";
import { getCountryName, getFlagUrl } from "../utilities/CountryCode";
import { Singleton } from "../utilities/Singleton";
import { playClick, playError, playKaching } from "../visuals/Sound";
import { BuildingColorComponent } from "./BuildingColorComponent";
import { BuildingDescriptionComponent } from "./BuildingDescriptionComponent";
import type { IBuildingComponentProps } from "./BuildingPage";
import { BuildingWikipediaComponent } from "./BuildingWikipediaComponent";
import { ConfirmModal } from "./ConfirmModal";
import { FillPlayerTradeModal } from "./FillPlayerTradeModal";
import { FixedLengthText } from "./FixedLengthText";
import { showModal, showToast } from "./GlobalModal";
import { FormatNumber } from "./HelperComponents";
import { TableView } from "./TableView";
import { TextWithHelp } from "./TextWithHelpComponent";

interface IActiveImport {
   xy: Tile;
   resource: Resource;
   settings: IResourceImport;
}

export function CaravanWarehouseWonder({ gameState, xy }: IBuildingComponentProps): React.ReactNode {
   const [buyResourceFilter, setBuyResourceFilter] = useState<Resource | null>(null);
   const [selected, setSelected] = useState(new Set<number>());

   const building = gameState.tiles.get(xy)?.building;
   if (!building) {
      return null;
   }

   let trades = useTrades();
   const user = useUser();

   trades = [
      {
         buyAmount: 100,
         buyResource: "Wood",
         sellAmount: 100,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },
      {
         buyAmount: 1000,
         buyResource: "Wood",
         sellAmount: 1000,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },
      {
         buyAmount: 10000,
         buyResource: "Wood",
         sellAmount: 10000,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },      
      {
         buyAmount: 100000,
         buyResource: "Wood",
         sellAmount: 100000,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },      
      {
         buyAmount: 1000000,
         buyResource: "Wood",
         sellAmount: 1000000,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },      
      {
         buyAmount: 10000000,
         buyResource: "Wood",
         sellAmount: 10000000,
         sellResource: "Stone",
         from: "Bob",
         fromFlag: "",
         fromLevel: 2,
         fromId: "1",
      },      
   ];
   const activeImports: IActiveImport[] = [];

   /*const warehouseBuildings = getBuildingsByType("Warehouse", gameState);
   warehouseBuildings?.forEach((tile, xy) => {
      const warehouse = tile.building as IResourceImportBuildingData;
      forEach(warehouse.resourceImports, (resource, v) => {
         activeImports.push({ xy, resource, settings: v });
      });
   });*/

   const caravansaryBuildings = getBuildingsByType("Caravansary", gameState);
   caravansaryBuildings?.forEach((tile, xy) => {
      const caravansary = tile.building as IResourceImportBuildingData;
      forEach(caravansary.resourceImports, (resource, v) => {
         if (v.perCycle > 0) {
            activeImports.push({ xy, resource, settings: v });
         }
      });
   });

   const resources = keysOf(unlockedResources(gameState)).filter((r) => !NoStorage[r] && !NoPrice[r]);

   return (
      <div className="window-body">
         <BuildingDescriptionComponent gameState={gameState} xy={xy} />
         <fieldset>
            <legend>Active Imports</legend>
            <TableView
               classNames="sticky-header f1"
               styles={{ maxHeight: "200px", overflow: "auto" }}
               header={[
                  { name: "Resource", sortable: true },
                  { name: "Per Cycle", sortable: true },
                  { name: "Max Amount", sortable: true },
                  { name: "", sortable: false },
               ]}
               data={activeImports}
               compareFunc={(a, b, col) => {
                  return 0;
               }}
               renderRow={(item) => {
                  const building = gameState.tiles.get(item.xy)?.building as IResourceImportBuildingData;
                  return (
                     <tr>
                        <td>
                           <div>{Config.Resource[item.resource].name()}</div>
                        </td>
                        <td className="text-right">
                           <FormatNumber value={item.settings.perCycle} />
                        </td>
                        <td className="text-right">
                           <FormatNumber value={item.settings.cap} />
                        </td>
                        <td style={{ width: 0 }}>
                           <div className="row">
                              <div
                                 className="text-right m-icon small text-red pointer"
                                 onClick={() => {
                                    playClick();
                                    delete building.resourceImports[item.resource];
                                    notifyGameStateUpdate();
                                 }}
                              >
                                 delete
                              </div>
                              <div
                                 className="m-icon small pointer"
                                 onPointerDown={() => {
                                    playClick();
                                    Singleton()
                                       .sceneManager.getCurrent(WorldScene)
                                       ?.lookAtTile(item.xy, LookAtMode.Select);
                                 }}
                              >
                                 open_in_new
                              </div>
                           </div>
                        </td>
                     </tr>
                  );
               }}
            />
         </fieldset>

         <div className="sep10"></div>
         <fieldset>
            <legend>Select Resource To Import</legend>
            <div className="row">
               <select
                  className="f1"
                  value={buyResourceFilter ? buyResourceFilter : ""}
                  onChange={(e) => {
                     if (e.target.value in Config.Resource) {
                        setBuyResourceFilter(e.target.value as Resource);
                     } else {
                        setBuyResourceFilter(null);
                     }
                  }}
               >
                  <option value=""></option>
                  {Array.from(resources)
                     .sort((a, b) => Config.Resource[a].name().localeCompare(Config.Resource[b].name()))
                     .map((res) => (
                        <option key={res} value={res}>
                           {Config.Resource[res].name()}
                        </option>
                     ))}
               </select>
            </div>
         </fieldset>
         {buyResourceFilter !== null ? (
            <>
               <div className="sep10"></div>
               <TableView
                  header={[
                     { name: "", sortable: false },
                     { name: "Storage - Current / Capacity", sortable: true },
                     { name: "Per Cycle - Avaliable / Max", sortable: true },
                     { name: "", sortable: false },
                  ]}
                  data={Array.from(caravansaryBuildings!.keys())}
                  compareFunc={(a, b, col) => {
                     return 0;
                  }}
                  renderRow={(item) => {
                     const tile = caravansaryBuildings?.get(item);
                     const building = gameState.tiles.get(item)?.building as IResourceImportBuildingData;

                     const baseCapacity = getResourceImportCapacity(building, 1);
                     const capacityMultiplier = totalMultiplierFor(item, "output", 1, false, gameState);

                     const maxPerCycle = Math.floor(baseCapacity * capacityMultiplier);
                     let usedPerCycle = 0;
                     keysOf(building.resourceImports).forEach((value, index) => {
                        usedPerCycle += building.resourceImports[value]!.perCycle;
                     });
                     const resource = Config.Resource[buyResourceFilter];
                     const capacity = building.resourceImports[buyResourceFilter]
                        ? building.resourceImports[buyResourceFilter]?.cap
                        : 0;
                     return (
                        <tr>
                           <td
                              onClick={() => {
                                 if (selected.has(item)) {
                                    selected.delete(item);
                                 } else {
                                    selected.add(item);
                                 }
                                 setSelected(new Set(selected));
                              }}
                           >
                              {selected.has(item) ? (
                                 <div className="m-icon small text-blue">check_box</div>
                              ) : (
                                 <div className="m-icon small text-desc">check_box_outline_blank</div>
                              )}
                           </td>
                           <td className="text-right">
                              <FormatNumber value={building.resources[buyResourceFilter] ?? 0} />
                              {" / "}
                              <FormatNumber value={capacity} />
                           </td>
                           <td className="text-right">
                              <FormatNumber value={maxPerCycle - usedPerCycle} />
                              {" / "}
                              <FormatNumber value={maxPerCycle} />
                           </td>
                           <td style={{ width: 0 }}>
                              <div className="row">
                                 <Tippy
                                    content={
                                       "Clear this Caravansarys imports. Clears Per Cycle and Max Amount for all Resources"
                                    }
                                 >
                                    <div
                                       className="text-right m-icon small text-red pointer"
                                       onClick={() => {
                                          playClick();
                                          forEach(building.resourceImports, (res, v) => {
                                             v.perCycle = 0;
                                             v.cap = 0;
                                          });

                                          notifyGameStateUpdate();
                                       }}
                                    >
                                       layers_clear
                                    </div>
                                 </Tippy>
                                 <div
                                    className="m-icon small pointer"
                                    onPointerDown={() => {
                                       playClick();
                                       Singleton()
                                          .sceneManager.getCurrent(WorldScene)
                                          ?.lookAtTile(item, LookAtMode.Select);
                                    }}
                                 >
                                    open_in_new
                                 </div>
                              </div>
                           </td>
                        </tr>
                     );
                  }}
               />
               <div className="sep10" />

               <div className="row">
                  <div className="col">
                     <div className="row text-small"></div>
                     <div className="row text-small">
                        {[0, 0.1, 0.25, 0.5, 0.75, 1].map((p) => (
                           <span key={p} className="ml10 text-strong text-link" onClick={() => {}}>
                              {formatPercent(p)}
                           </span>
                        ))}
                     </div>
                  </div>
                  <div className="col f1">
                     <div className="row text-small">
                        <div className="f1"></div>
                        <div
                           className="text-link mr10"
                           onClick={() => {
                              playClick();

                              notifyGameStateUpdate();
                           }}
                        >
                           Import Selected
                        </div>
                     </div>
                     <div className="row text-small">
                        <div className="f1"></div>
                        <div className="text-link mr10" onClick={() => {}}>
                           Clear Selected
                        </div>
                     </div>
                  </div>
               </div>

               <div className="sep5"></div>
               <div className="row text-small"></div>

               {/*<AddTradeComponent gameState={gameState} xy={xy} />*/}

               <div className="sep10"></div>
               <TableView
                  header={[
                     { name: t(L.PlayerTradeWant), sortable: true },
                     { name: t(L.PlayerTradeOffer), sortable: true },
                     { name: "", sortable: true },
                     { name: t(L.PlayerTradeFrom), sortable: true },
                     { name: "", sortable: false },
                  ]}
                  paginate={true}
                  data={trades.filter(
                     (trade) =>
                        buyResourceFilter === trade.buyResource || buyResourceFilter === trade.sellResource,
                  )}
                  compareFunc={(a, b, i) => {
                     return 0;
                  }}
                  renderRow={(trade) => {
                     const disableFill = user === null || trade.fromId === user.userId;
                     const percentage = getTradePercentage(trade);
                     return (
                        <tr
                           key={trade.id}
                           className={classNames({ "text-strong": trade.fromId === user?.userId })}
                        >
                           <td>
                              <div className="row w100">
                                 <div className="col">
                                    <div
                                       className={classNames({
                                          "text-strong": building.resources[trade.buyResource],
                                       })}
                                    >
                                       {Config.Resource[trade.buyResource].name()}
                                    </div>
                                    <div className="text-small text-strong text-desc">
                                       <FormatNumber value={trade.buyAmount} />
                                    </div>
                                 </div>
                                 <div className="col f1">
                                    <div
                                       className="text-right m-icon small text-red pointer"
                                       onClick={() => {
                                          playClick();
                                          //delete building.resourceImports[item.resource];
                                          notifyGameStateUpdate();
                                       }}
                                    >
                                       input
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td>
                              <div>{Config.Resource[trade.sellResource].name()}</div>
                              <div className="text-small text-strong text-desc">
                                 <FormatNumber value={trade.sellAmount} />
                              </div>
                           </td>
                           <td
                              className={classNames({
                                 "text-small text-right": true,
                                 "text-red": percentage <= -CURRENCY_PERCENT_EPSILON,
                                 "text-green": percentage >= CURRENCY_PERCENT_EPSILON,
                                 "text-desc": Math.abs(percentage) < CURRENCY_PERCENT_EPSILON,
                              })}
                           >
                              <Tippy content={t(L.MarketValueDesc, { value: formatPercent(percentage, 0) })}>
                                 <div>
                                    {mathSign(percentage, CURRENCY_PERCENT_EPSILON)}
                                    {formatPercent(Math.abs(percentage), 0)}
                                 </div>
                              </Tippy>
                           </td>
                           <td>
                              <div className="row">
                                 <img
                                    src={getFlagUrl(trade.fromFlag)}
                                    className="player-flag game-cursor"
                                    title={getCountryName(trade.fromFlag)}
                                 />
                                 {trade.fromLevel > 0 ? (
                                    <img
                                       src={AccountLevelImages[trade.fromLevel]}
                                       className="player-flag"
                                       title={AccountLevelNames[trade.fromLevel]()}
                                    />
                                 ) : null}
                              </div>
                              <div className="text-small">
                                 <FixedLengthText text={trade.from} length={10} />
                              </div>
                           </td>
                           <td>
                              {trade.fromId === user?.userId ? (
                                 <div
                                    className="m-icon small text-link"
                                    onClick={() => {
                                       showModal(
                                          <ConfirmModal
                                             title={t(L.PlayerTradeCancelTrade)}
                                             onConfirm={async () => {
                                                try {
                                                   const { total, used } = getStorageFor(xy, gameState);
                                                   if (
                                                      used + trade.sellAmount * TRADE_CANCEL_REFUND_PERCENT >
                                                      total
                                                   ) {
                                                      throw new Error(
                                                         t(L.PlayerTradeCancelTradeNotEnoughStorage),
                                                      );
                                                   }
                                                   const cancelledTrade = await client.cancelTrade(trade.id);
                                                   safeAdd(
                                                      building.resources,
                                                      cancelledTrade.sellResource,
                                                      cancelledTrade.sellAmount * TRADE_CANCEL_REFUND_PERCENT,
                                                   );
                                                   playKaching();
                                                } catch (error) {
                                                   showToast(String(error));
                                                   playError();
                                                }
                                             }}
                                          >
                                             {t(L.PlayerTradeCancelDesc, {
                                                percent: formatPercent(TRADE_CANCEL_REFUND_PERCENT),
                                             })}
                                          </ConfirmModal>,
                                       );
                                    }}
                                 >
                                    delete
                                 </div>
                              ) : (
                                 <div
                                    className={classNames({
                                       "text-link": !disableFill,
                                       "text-strong": true,
                                       "text-desc": disableFill,
                                    })}
                                    onClick={() => {
                                       if (!disableFill) {
                                          showModal(<FillPlayerTradeModal tradeId={trade.id} xy={xy} />);
                                       }
                                    }}
                                 >
                                    {t(L.PlayerTradeFill)}
                                 </div>
                              )}
                           </td>
                        </tr>
                     );
                  }}
               />
            </>
         ) : (
            <></>
         )}

         <div className="sep10"></div>
         <BuildingWikipediaComponent gameState={gameState} xy={xy} />
         <BuildingColorComponent gameState={gameState} xy={xy} />
      </div>
   );
}

export function AddTradeComponent({ gameState, xy }: IBuildingComponentProps): React.ReactNode {
   const user = useUser();
   const trades = useTrades();
   const enabled = true;
   //!isNullOrUndefined(user) &&
   //trades.filter((t) => t.fromId === user.userId).length < getMaxActiveTrades(user);
   const buyResources = keysOf(unlockedResources(gameState)).filter((r) => !NoStorage[r] && !NoPrice[r]);

   // Get all resources in storage across all caravans
   const caravansaryBuildings = getBuildingsByType("Caravansary", gameState);
   const resourcesInStorage: Partial<Tabulate<keyof ResourceDefinitions>> = {};
   caravansaryBuildings?.forEach((tile, xy) => {
      const building = tile.building as IResourceImportBuildingData;
      const resources = building.resources ?? {};
      keysOf(resources).forEach((res) => {
         resourcesInStorage[res] = (resourcesInStorage[res] || 0) + resources[res]!;
      });
   });

   //const resourcesInStorage = gameState.tiles.get(xy)?.building?.resources ?? {};

   const sellResources = keysOf(resourcesInStorage);
   const [trade, setTrade] = useState<IClientAddTradeRequest>({
      buyResource: buyResources[0],
      buyAmount: 0,
      sellResource: sellResources[0],
      sellAmount: 0,
   });
   const [showTrade, setShowTrade] = useState(false);
   const [rangeMin, rangeMax] = getBuyAmountRange(trade, user);

   function isTradeValid(trade: IClientAddTradeRequest): boolean {
      if (trade.buyResource === trade.sellResource) {
         return false;
      }
      if (trade.buyAmount < 1) {
         return false;
      }
      if (trade.buyAmount > rangeMax || trade.buyAmount < rangeMin) {
         return false;
      }
      if (trade.sellAmount < 0 || trade.sellAmount > (resourcesInStorage[trade.sellResource] ?? 0)) {
         return false;
      }
      return true;
   }

   if (showTrade) {
      return (
         <fieldset>
            <legend className="text-strong">{t(L.PlayerTradeIOffer)}</legend>
            <div className="sep10"></div>
            <div className="row">
               <div style={{ width: "80px" }}>{t(L.PlayerTradeResource)}</div>
               <select
                  className="f1"
                  value={trade.sellResource}
                  onChange={(e) => {
                     if (e.target.value in Config.Resource) {
                        setTrade({ ...trade, sellResource: e.target.value as Resource });
                     }
                  }}
               >
                  {sellResources
                     .sort((a, b) => {
                        return Config.Resource[a].name().localeCompare(Config.Resource[b].name());
                     })
                     .map((res) => (
                        <option key={res} value={res}>
                           {Config.Resource[res].name()}
                        </option>
                     ))}
               </select>
            </div>
            <div className="sep10"></div>
            <div className="row">
               <div style={{ width: "80px" }}>{t(L.PlayerTradeAmount)}</div>
               <input
                  className="f1 text-right w100"
                  type="text"
                  value={trade.sellAmount}
                  onChange={(e) => setTrade({ ...trade, sellAmount: safeParseInt(e.target.value) })}
               />
            </div>
            <div className="sep5"></div>
            <div className="row text-desc text-small">
               <div style={{ width: "80px" }}></div>
               <div>
                  0 ~ <FormatNumber value={resourcesInStorage[trade.sellResource] ?? 0} />
               </div>
               <div className="f1"></div>
               <div
                  className="text-link text-strong mr10"
                  onClick={() =>
                     setTrade({
                        ...trade,
                        sellAmount: Math.floor((resourcesInStorage[trade.sellResource] ?? 0) * 0.5),
                     })
                  }
               >
                  {t(L.PlayerTradeSetHalf)}
               </div>
               <div
                  className="text-link text-strong"
                  onClick={() =>
                     setTrade({
                        ...trade,
                        sellAmount: Math.floor(resourcesInStorage[trade.sellResource] ?? 0),
                     })
                  }
               >
                  {t(L.PlayerTradeSetMax)}
               </div>
            </div>
            <div className="separator has-title">
               <div className="text-strong">{t(L.PlayerTradeIWant)}</div>
            </div>
            <div className="sep10" />
            <div className="row">
               <div style={{ width: "80px" }}>{t(L.PlayerTradeResource)}</div>
               <select
                  className="f1"
                  value={trade.buyResource}
                  onChange={(e) => {
                     if (e.target.value in Config.Resource) {
                        setTrade({ ...trade, buyResource: e.target.value as Resource });
                     }
                  }}
               >
                  {buyResources
                     .sort((a, b) => {
                        return Config.Resource[a].name().localeCompare(Config.Resource[b].name());
                     })
                     .map((res) => (
                        <option key={res} value={res}>
                           {Config.Resource[res].name()}
                        </option>
                     ))}
               </select>
            </div>
            <div className="sep10"></div>
            <div className="row">
               <div style={{ width: "80px" }}>{t(L.PlayerTradeAmount)}</div>
               <input
                  className="f1 text-right w100"
                  type="text"
                  value={trade.buyAmount}
                  onChange={(e) => setTrade({ ...trade, buyAmount: safeParseInt(e.target.value) })}
               />
            </div>
            <div className="sep5" />
            <div className="row text-desc text-small">
               <div style={{ width: "80px" }}></div>
               <div>
                  <FormatNumber value={rangeMin} /> ~ <FormatNumber value={rangeMax} />
               </div>
               <div className="f1" />
               <div
                  className="text-link text-strong mr10"
                  onClick={() => setTrade({ ...trade, buyAmount: rangeMin })}
               >
                  {t(L.PlayerTradeSetMin)}
               </div>
               <div
                  className="text-link text-strong"
                  onClick={() => setTrade({ ...trade, buyAmount: rangeMax })}
               >
                  {t(L.PlayerTradeSetMax)}
               </div>
            </div>
            <div className="sep15"></div>
            <div className="row">
               <button
                  className="row f1 jcc"
                  disabled={!isTradeValid(trade) || !enabled}
                  onClick={async () => {
                     if (
                        !isTradeValid(trade) ||
                        !enabled ||
                        (resourcesInStorage[trade.sellResource] ?? 0) < trade.sellAmount
                     ) {
                        playError();
                        showToast(t(L.OperationNotAllowedError));
                        return;
                     }
                     try {
                        // Note: we deduct the resources first otherwise resource can go negative if a player
                        // clicks really fast. If the trade fails, we refund the player
                        resourcesInStorage[trade.sellResource]! -= trade.sellAmount;
                        await client.addTrade(trade);
                        playKaching();
                        showToast(t(L.PlayerTradeAddSuccess));
                     } catch (error) {
                        resourcesInStorage[trade.sellResource]! += trade.sellAmount;
                        playError();
                        showToast(String(error));
                     }
                  }}
               >
                  <div className="m-icon small">shopping_cart</div>
                  <div className="text-strong">{t(L.PlayerTradePlaceTrade)}</div>
               </button>
               <div style={{ width: "10px" }}></div>
               <button
                  className="row f1 jcc"
                  onClick={() => {
                     setShowTrade(false);
                  }}
               >
                  {t(L.PlayerTradeAddTradeCancel)}
               </button>
            </div>
         </fieldset>
      );
   }
   return (
      <button
         className="row w100 jcc mb10"
         onClick={() => {
            if (enabled) {
               setShowTrade(true);
            } else {
               playError();
            }
         }}
         disabled={!enabled}
      >
         <div className="m-icon small">add_circle</div>
         <div className="text-strong f1">
            <TextWithHelp content={enabled ? null : t(L.PlayerTradeMaxTradeExceeded)} noStyle>
               {t(L.PlayerTradeNewTrade)}
            </TextWithHelp>
         </div>
      </button>
   );
}
