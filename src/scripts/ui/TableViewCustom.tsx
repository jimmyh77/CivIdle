import { useState } from "react";

export interface ITableHeader {
   name: React.ReactNode;
   sortable: boolean;
   className?: string;
   right?: boolean;
   content?: string;
}

export function TableViewCustom<T>({
   classNames,
   header,
   data,
   compareFunc,
   renderRow,
   sortingState,
}: {
   classNames?: string;
   header: ITableHeader[];
   data: T[];
   renderRow: (item: T) => React.ReactNode;
   compareFunc: (a: T, b: T, col: number, asc: 1 | -1) => number;
   sortingState?: { column: number; asc: boolean };
}): React.ReactNode {
   const [sortColumn, setSortColumn] = useState(sortingState?.column ?? header.findIndex((v) => v.sortable));
   if (import.meta.env.DEV) {
      console.assert(header[sortColumn].sortable, "TableView: Column is not sortable!");
   }
   const [asc, setAsc] = useState(sortingState?.asc ?? true);
   return (
      <div className={`table-view-custom ${classNames ?? ""}`}>
         <div className="table-container" style={{ gridTemplateColumns: "2rem 15rem 15rem auto" }}>
            {header.map((h, index) => (
               <div key={index} className={`table-header ${h.className ?? ""}`} onClick={() => {}}>
                  {h.name}
                  <span dangerouslySetInnerHTML={{ __html: h.content }} />
               </div>
            ))}

            {data
               .sort((a, b) => {
                  const o = asc ? 1 : -1;
                  return o * compareFunc(a, b, sortColumn, o);
               })
               .map(renderRow)}
         </div>
      </div>
   );
}
