import * as BitPacked from "./BitPacked"

export const encodeOrder = (order, encoding, itemFieldNames) => {
  console.debug("encodeOrder", { order, encoding, itemFieldNames });
  const { orderKey, variantKey, quantityKey } = itemFieldNames;
  let encodedOrder = {};
  switch (encoding) {
    case "Alphanumeric": {
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = order[orderKey].reduce(
        (str, { v, q }) => `${str}${v}:${q}/`,
        ""
      );
      encodedOrder.mode = "alphanumeric";
      encodedOrder.data = `$1${platform}%${conferenceCode}%${transactionId}%${encodedItems}$`;
      break;
    }
    case "PER": {
      let hex = BitPacked.encode(order);

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