import * as BitPacked from "./BitPacked"

export const encodeOrder = (order, encoding, itemFieldNames) => {
  console.debug("encodeOrder", { order, encoding, itemFieldNames });
  let { transactionId, conferenceCode, platform, items } = order;
  let encodedOrder = {};
  switch (encoding) {
    case "Alphanumeric": {
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = items.reduce(
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
      const obj = {
        txn: transactionId,
        cc: conferenceCode,
        p: platform,
        i: items,
      };
      encodedOrder.encoding = "utf-8";
      encodedOrder.mode = "byte";
      encodedOrder.data = JSON.stringify(obj);
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