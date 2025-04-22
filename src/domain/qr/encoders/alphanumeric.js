function encodeAlphanumeric(data) {
  validateLength(data, 1, 2, "Alphanumeric");
  let value = AlphaNumCharMap.indexOf(data[0]);
  let length = 6;
  if (data.length === 2) {
    value =
      AlphaNumCharMap.indexOf(data[0]) * 45 + AlphaNumCharMap.indexOf(data[1]);
    length = 11;
  }
  return { value, length };
}