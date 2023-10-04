import React, { useState, useEffect } from "react";
import { Button, Input, Breadcrumb, Tooltip, Spin } from "antd";

import { InfoCircleOutlined } from "@ant-design/icons";

import { postInboundBarcode, getCurrentInbound } from "../api";
import { ICurrentBarcodeData } from "@src/types";

const InboundPage: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [errorText, setErrorText] = useState("");
  const [currentBarcode, setCurrentBarcode] = useState("");
  const [currentBarcodeData, setCurrentBarcodeData] =
    useState<ICurrentBarcodeData>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const response = await getCurrentInbound();
      if (response.data && response.data.barcode_input) {
        setCurrentBarcode(response.data.barcode_input);
        setCurrentBarcodeData(response.data.upc_data.items[0]);
      } else {
        setCurrentBarcode("No barcode found");
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handleInputChange = (e: any) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = async () => {
    try {
      setLoading(true);
      setErrorText("");
      if (inputValue.toLocaleLowerCase().trim() === "") {
        return;
      }
      console.log(inputValue);
      await postInboundBarcode(inputValue);

      const response = await getCurrentInbound();
      console.log("Get reponse input after: ", response);
      if (response.data && response.data.barcode_input) {
        console.log("Set input");
        setCurrentBarcode(response.data.barcode_input);
        setCurrentBarcodeData(response.data.upc_data.items[0]);
      }

      setInputValue("");
    } catch (error: any) {
      if (error?.response?.data?.message) {
        setErrorText(error?.response?.data?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Breadcrumb
        style={{ margin: "16px 0" }}
        items={[
          {
            title: <a href="/">Dashboard</a>,
          },
          {
            title: <a href="/inbound">Inbound</a>,
          },
        ]}
      />
      <div className="d-flex flex-column border rounded p-2">
        <span className="fs-6 fw-bold">Current Barcode</span>
        <span className="pb-2" style={{ color: "grey" }}>
          Incoming parcels with tag will be registered under this barcode
        </span>
        <span>{currentBarcode}</span>
        <span>{currentBarcodeData?.title ?? ""}</span>
      </div>
      <h5 className="mt-2">
        Barcode Inbound Registeration
        <Tooltip
          title="As a pallet of one product going through, after attaching NFC tag to each parcel, 
        scanning parcel to the system with the tag is important. Set the value below to a product barcode for the next incoming parcels."
          placement="bottom"
        >
          <InfoCircleOutlined style={{ marginLeft: "8px" }} />
        </Tooltip>
      </h5>
      <span style={{ color: "grey" }}></span>
      <Input
        className="my-2"
        placeholder="Entering barcode for incoming pallets"
        value={inputValue}
        onChange={handleInputChange}
      />

      {errorText !== "" && (
        <div className="alert alert-danger my-2" role="alert">
          {errorText}
        </div>
      )}

      <Button
        className="my-2"
        type="primary"
        onClick={handleButtonClick}
        style={{}}
        disabled={loading}
      >
        {loading && <Spin />}
        Update barcode
      </Button>
    </div>
  );
};

export default InboundPage;
