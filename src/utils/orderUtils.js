import * as BitPacked from "./BitPacked";
import * as ModHex from "./ModHex";
import * as NTRU from "./NTRUPrime";

export const encodeOrder = (order, encoding, fieldNames) => {
  console.debug("encodeOrder", { order, encoding, fieldNames });
  const stdOrder = standardizeOrder(order, fieldNames);
  let encodedOrder = {};
  switch (encoding) {
    case "Alphanumeric": {
      console.debug("encodeOrder, Alphanumeric", {
        order,
        stdOrder,
        fieldNames,
      });
      const { itemsKey } = fieldNames;
      encodedOrder.mode = "alphanumeric";
      // ENCAPSULATOR = "$";
      // FIELD_SEPARATOR = "%";
      // QTY_SEPARATOR = ":";
      // TERMINATOR = "/";
      const encodedItems = stdOrder.items.reduce(
        (str, { variant, quantity }) => `${str}${variant}:${quantity}/`,
        ""
      );
      delete stdOrder.items;
      console.debug("encodeOrder, Alphanumeric", {
        order,
        stdOrder,
        encodedItems,
      });

      let data = `$1`;
      Object.values(stdOrder).forEach((v) => (data = `${data}%${v}`));
      data = `${data}%${encodedItems}$`;

      console.debug("encodeOrder, Alphanumeric", { data });
      encodedOrder.data = data;
      break;
    }
    case "PER": {
      const data = BitPacked.encode(stdOrder);
      console.debug("PER-ModHex", { data });
      encodedOrder.encoding = "hex";
      encodedOrder.mode = "byte";
      encodedOrder.data = BitPacked.encode(stdOrder);
      break;
    }
    case "PER-ModHex": {
      let data = BitPacked.encode(stdOrder);
      console.debug("PER-ModHex", { data });
      if (data % 2 === 1) data = `0${data}`;
      console.debug("PER-ModHex", { data });
      const modhex = ModHex.encode(data);
      console.debug("PER-ModHex", { data, modhex });
      encodedOrder.encoding = "modHex";
      encodedOrder.mode = "alphanumeric";
      encodedOrder.data = modhex;
      break;
    }
    case "PER-NTRU": {
      let data = BitPacked.encode(stdOrder);
      const bytes = [];
      for (let i = 0; i < data.length; i += 2) {
        const hex = data.substring(i, i + 2);
        bytes.push(parseInt(data.substring(i, i + 2), 16));
      }
      const moduli = bytes.map(() => 256);
      console.debug("PER-NTRU", { bytes, moduli });
      const encoded = NTRU.encode(bytes, moduli);
      console.debug("PER-ModHex", { data, encoded });
      encodedOrder.encoding = "ntru";
      encodedOrder.mode = "alphanumeric";
      encodedOrder.data = encoded.join("");
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
    itemsKey,
    variantKey,
    quantityKey,
  } = fieldNames;
  const items = order[itemsKey].map((item) => ({
    variant: item[variantKey],
    quantity: item[quantityKey],
  }));
  const stdOrder = {
    ...order,
    transactionId: order[transactionKey],
    conferenceCode: order[conferenceKey],
    platform: order[platformKey],
    items,
  };
  delete stdOrder[platformKey];
  delete stdOrder[conferenceKey];
  delete stdOrder[transactionKey];
  delete stdOrder[itemsKey];

  return stdOrder;
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
