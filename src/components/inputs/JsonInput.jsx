<div key={0} className="input-group">
            <textarea
              type="text"
              rows={16}
              value={order}
              onChange={(e) => {
                const newInput = e.target.value;
                setOrder(newInput);
                updateQRData(newInput, encoding);
              }}
            />
          </div>
          <div>
            <OrderEncodingSelector
              encoding={encoding}
              setEncoding={setEncoding}
            />
          </div>