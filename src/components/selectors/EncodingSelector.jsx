const Encodings = ["JSON", "Alphanumeric", "PER", "PER-ModHex", "PER-NTRU"];
export function OrderEncodingSelector({ encoding, setEncoding, onChange }) {
  const handleChange = (e) => {
    const newEncoding = e.target.value;
    setEncoding(newEncoding);
  };

  return (
    <div className="label-select-row">
      <label htmlFor="encoding">Encoding:</label>
      <select id="encoding" value={encoding} onChange={handleChange}>
        {Encodings.map((encoding, idx) => (
          <option key={encoding} value={encoding}>
            {encoding}
          </option>
        ))}
      </select>
    </div>
  );
}