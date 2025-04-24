const isBinary = (str) =>
  /^(?:0b)?(?:[01]{8}(?:\s+[01]{8})+|(?:[01]{8})+)$/i.test(str);
const isHex = (str) =>
  /^(?:0x)?(?:[0-9A-F]{2}(?:\s+[0-9A-F]{2})+|(?:[0-9A-F]{2})+)$/i.test(str);

export function parseInput(input) {
  console.debug("parseInput",{input});
  if (!input || !input.data || !input.mode) return {};
  let { mode, data, encoding } = input;
  const forceUtf = encoding === "utf-8";

  let parsedInput = { mode };

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
    case "byte": {
      if (isBinary(data) && !forceUtf) {
        let hex = "";
        let bin = data.replace(/^0b/i, "");
        bin = bin.replace(/\s+/g, "");

        if (bin.length % 8 !== 0) {
          throw new Error(
            "Invalid binary string: length must be byte aligned."
          );
        }

        for (let i = 0; i < bin.length; i += 4) {
          let val = parseInt(bin.substring(i, i + 4), 2);
          hex = hex.concat(val.toString(16));
        }
        parsedInput.encoding = "hex";
        parsedInput.bytes = hex;
      } else if (isHex(data) && !forceUtf) {
        let hex = data.replace(/0x/gi, "");
        hex = hex.replace(/\s+/g, "");

        if (hex.length % 2 !== 0) {
          throw new Error("Invalid hex string: length must be even.");
        }
        parsedInput.encoding = "hex";
        parsedInput.bytes = hex;
      } else {
        console.log(
          "input value for byte mode did not match binary or hex encoding"
        );
        parsedInput.encoding = "utf-8";
        parsedInput.data = data;
      }

      break;
    }
    default: {
      parsedInput.data = data;
    }
  }

  return parsedInput;
}
