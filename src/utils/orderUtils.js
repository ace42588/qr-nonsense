import * as BitPacked from "./BitPacked";

export const encodeOrder = (order, encoding, fieldNames) => {
  console.debug("encodeOrder", { order, encoding, fieldNames });
  const standardOrder = standardizeOrder(order, fieldNames);
  let encodedOrder = {};
  switch (encoding) {
    case "Alphanumeric": {
      encodedOrder.mode = "alphanumeric";
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = order[orderKey].reduce(
        (str, item) => `${str}${item[variantKey]}:${item[quantityKey]}/`,
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
      const standardOrder = standardizeOrder(order, fieldNames);
      let hex = BitPacked.encode(standardOrder);

      encodedOrder.encoding = "hex";
      encodedOrder.mode = "byte";
      encodedOrder.data = hex;
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
