const isBinary = (str) =>
  /^(?:0b)?(?:[01]{1,}(?:\s+[01]{1,})+|(?:[01]{1,})+)$/i.test(str);
const isHex = (str) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(str);

export const INPUT_TYPES = ["basic", "json", "bitField"];

export function inferType(input) {
  if (input?.type && INPUT_TYPES.includes(input.type)) return input.type;
  if (input?.fields && input?.values) return "bitField";
  if (typeof input?.data === "object") return "json";
  if (typeof input?.data === "string") {
    try {
      JSON.parse(input.data);
      return "json";
    } catch {
      return "basic";
    }
  }
  return "basic";
}


export function parseInput(input) {
  //console.debug("parseInput",{input});
  if (!input || !input.data || !input.mode) return {};
  let { mode, data, encoding } = input;

  const parsedInput = { mode, data, encoding };

  switch (mode) {
    case "numeric": {
      const regex = /\d+/gm;
      const match = data.match(regex);
      parsedInput.data = match ? match.join("") : "";
      break;
    }
    case "alphanumeric": {
      const regex = /[0-9A-Z \$\%\*\+\-\.\/:]+/gm;
      let upperCase = data.toUpperCase();
      const match = upperCase.match(regex);
      parsedInput.data = match ? match.join("") : "";
      break;
    }
    default: { // defualt to byte
      if (encoding === "utf-8") {
        console.debug("parsedInput", "Forcing UTF-8 interpretation for input");
        break;
      }
      if (isBinary(data)) {
        console.debug("parsedInput", "Interpreting input as binary...");
        let hex = "";
        let bin = data.replace(/^0b/i, "");
        bin = bin.replace(/\s+/g, "");

        for (let i = 0; i < bin.length; i += 4) {
          let val = parseInt(bin.substring(i, i + 4), 2);
          hex = hex.concat(val.toString(16));
        }
        parsedInput.encoding = "hex";
        parsedInput.data = hex;
        break;
      } else if (isHex(data)) {
        console.debug("parsedInput", "Interpreting input as hex...");
        let hex = data.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
        parsedInput.encoding = "hex";
        parsedInput.data = hex;
        break;
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        parsedInput.encoding = "utf-8";
      }
    }
  }
  
  console.debug("parsedInput: returning", parsedInput);

  return parsedInput;
}
