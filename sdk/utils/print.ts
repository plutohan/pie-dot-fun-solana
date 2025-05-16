import { Table } from "console-table-printer";
import { BasketConfig } from "../pie-program";

export function printBasketComponents(basketCfg: BasketConfig) {
  const table = new Table({
    columns: [
      { name: "mint", alignment: "left", color: "cyan" },
      { name: "quantity", alignment: "right", color: "green" },
    ],
  });

  for (const component of basketCfg.components) {
    table.addRow({
      mint: component.mint.toBase58(),
      quantity: component.quantityInSysDecimal.toString(),
    });
  }
  table.printTable();
}
