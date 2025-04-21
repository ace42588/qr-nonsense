import * as BitPacked from "./BitPacked";
import * as Modhex from "./ModHex";

export const encodeOrder = (order, encoding, fieldNames) => {
  console.debug("encodeOrder", { order, encoding, fieldNames });
  const stdOrder = standardizeOrder(order, fieldNames);
  let encodedOrder = {};
  switch (encoding) {
    case "Alphanumeric": {
      const { orderKey } = fieldNames;
      encodedOrder.mode = "alphanumeric";
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = stdOrder.items.reduce(
        (str, { variant, quantity }) => `${str}${variant}:${quantity}/`,
        ""
      );
      delete order[orderKey];

      let data = `$1`;
      Object.values(order).forEach((v) => (data = `${data}%${v}`));
      data = `${data}%${encodedItems}$`;

      encodedOrder.data = data;
      break;
    }
    case "PER": {
      const data = BitPacked.encode(stdOrder);
      console.debug("PER-ModHex", {data});
      encodedOrder.encoding = "hex";
      encodedOrder.mode = "byte";
      encodedOrder.data = BitPacked.encode(stdOrder);
      break;
    }
    case "PER-ModHex": {
      const data = BitPacked.encode(stdOrder);
      console.debug("PER-ModHex", {data});
      encodedOrder.encoding = "modHex";
      encodedOrder.mode = "alphanumeric";
      encodedOrder.data = BitPacked.encode(stdOrder);
      break;
    }
    default: {
      encodedOrder.encoding = "utf-8";
      encodedOrder.mode = "byte";
      encodedOrder.data = JSON.stringify(order);
    }
  }
  return encodedOrder;
};

function standardizeOrder(order, fieldNames) {
  const {
    platformKey,
    conferenceKey,
    transactionKey,
    orderKey,
    variantKey,
    quantityKey,
  } = fieldNames;
  const items = order[orderKey].map((item) => ({
    variant: item[variantKey],
    quantity: item[quantityKey],
  }));
  return {
    ...order,
    transactionId: order[transactionKey],
    conferenceCode: order[conferenceKey],
    platform: order[platformKey],
    items,
  };
}

export const parseOrderJson = (raw) => {
  let safe = raw.replace(/(?<!\\)\\?(\n|\r\n)/g, "");
  let parsedInput = null;
  //console.debug("parseInput", { raw, safe });
  try {
    let {
      txn: transactionId,
      cc: conferenceCode,
      p: platform,
      i: items,
    } = JSON.parse(safe);
    parsedInput = { transactionId, conferenceCode, platform, items };
  } catch (e) {
    console.debug("parseInput", `Error parsing ${raw}`);
  }

  return parsedInput;
};
