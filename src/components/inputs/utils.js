// ENCAPSULATOR = "$";
// FIELD_SEPARATOR = "%";
// QTY_SEPARATOR = ":";
// TERMINATOR = "/";
const replacers = {
  "{": "$",
  "}": "$",
  "[field]": "%",
  ":": ":",
  ",": "/"
}

function jsonToAlphanumeric(obj) {
  
}

const parseJson = (raw) => {
  let safe = raw.replace(/(?<!\\)\\?(\n|\r\n)/g, "");
  let parsedInput = null;
  //console.debug("parseInput", { raw, safe });
  try {
    parsedInput = JSON.parse(safe);
  } catch (e) {
    console.error("parseInput", `Error parsing ${raw}`);
  }
  //console.debug("parsedOrderJson", { parsedInput });
  return parsedInput;
};

export const encodeJson = (
  json,
  encoding,
) => {
  //console.debug("encodeOrder", { stdOrder });
  let encoded = {};
  switch (encoding) {
    case "Alphanumeric": {
      encoded.mode = "alphanumeric";
      const encodedItems = stdOrder.items.reduce(
        (str, { variant, quantity }) => `${str}${variant}:${quantity}/`,
        ""
      );
      delete stdOrder.items;


      let data = `$1`;
      Object.values(stdOrder).forEach((v) => (data = `${data}%${v}`));
      data = `${data}%${encodedItems}$`;

      //console.debug("encodeOrder, Alphanumeric", { data });
      encoded.data = data;
      break;
    }
    case "PER": {
      const data = BitPacked.encode(stdOrder);
      //console.debug("PER-ModHex", { data });
      encoded.encoding = "hex";
      encoded.mode = "byte";
      encoded.data = BitPacked.encode(stdOrder);
      break;
    }
    case "PER-ModHex": {
      let data = BitPacked.encode(stdOrder);
      //console.debug("PER-ModHex", { data });
      if (data % 2 === 1) data = `0${data}`;
      //console.debug("PER-ModHex", { data });
      const modhex = ModHex.encode(data);
      //console.debug("PER-ModHex", { data, modhex });
      encoded.encoding = "modHex";
      encoded.mode = "alphanumeric";
      encoded.data = modhex;
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
      //console.debug("PER-NTRU", { bytes, moduli });
      const encoded = NTRU.encode(bytes, moduli);
      //console.debug("PER-ModHex", { data, encoded });
      encoded.encoding = "ntru";
      encoded.mode = "alphanumeric";
      encoded.data = encoded.join("");
      break;
    }
    default: {
      encoded.encoding = "utf-8";
      encoded.mode = "byte";
      encoded.data = JSON.stringify(order);
    }
  }
  return encoded;
};
