const encodings = [
  {value: "JSON", label: "Direct JSON"},
  {value: "Alphanumeric", label: "Alphanumeric Only"},
  {value: "PER", label: "Packed Encoding Rule"},
  {value: "PER-ModHex", label: "Packed Encoding Rule, ModHex"},
  {value: "PER-NTRU", label: "Packed Encoding Rule, NTRU"},
]

export function EncodingSelector({ encoding, setEncoding, onChange }) {
  const handleChange = (e) => {
    const newEncoding = e.target.value;
    setEncoding(newEncoding);
  };

  return (
    <div className="label-select-row">
      <label htmlFor="encoding">Encoding:</label>
      <select id="encoding" value={encoding} onChange={handleChange}>
        {encodings.map((encoding, idx) => (
          <option key={encoding.value} value={encoding.value}>
            {encoding.label}
          </option>
        ))}
      </select>
    </div>
  );
}