import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Breadcrumb,
  Tooltip,
  Spin,
  Table,
  Modal,
  Form,
  Input,
  message,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { IPallet } from "@src/types";
import { Pallet } from "../api";

const OutboundManagement: React.FC = () => {
  const [pallets, setPallets] = useState<IPallet[]>([]);
  const [selectedPallet, setSelectedPallet] = useState<IPallet | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [loading, setLoading] = useState(false);
  const [outboundLoading, setOutboundLoading] = useState(false);

  const [isStarted, setIsStarted] = useState(false);

  const [form] = Form.useForm();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const fetchedPallets = await Pallet.getPallets();
      console.log("Pallets:", fetchedPallets);

      // For each pallet append the key property to the pallet i.e. key: 0 for the first pallet then so on
      const palletsWithKey = fetchedPallets.map((pallet, key) => {
        return { ...pallet, key };
      });

      console.log("Pallets with key:", palletsWithKey);

      setPallets(palletsWithKey);
    } catch (err: any) {
      console.log("Failed:", err);
      message.error(err.error);
    }
  }

  const columns = [
    {
      title: "ID",
      dataIndex: "_id",
      key: "_id",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text: string) => {
        let color = "";
        switch (text) {
          case "activated":
            color = "green";
            text = "Activated";
            break;
          case "out_for_delivery":
            color = "blue";
            text = "Out for Delivery";
            break;
          case "deactivated":
            color = "red";
            text = "Deactivated";
            break;
          default:
            color = "black";
        }
        return <span style={{ color: color, fontWeight: "bold" }}>{text}</span>;
      },
    },
    {
      title: "Date Created",
      dataIndex: "datetimecreated",
      key: "datetimecreated",
      render: (text: Date) => {
        const date = new Date(text);
        return `${date.toLocaleString()}`;
      },
    },
    {
      title: "Date Updated",
      dataIndex: "datetimeupdated",
      key: "datetimeupdated",
      render: (text: Date) => {
        const date = new Date(text);
        return `${date.toLocaleString()}`;
      },
    },
    {
      title: "Action",
      dataIndex: "",
      key: "x",
      render: (_: any, record: IPallet) => {
        return (
          <>
            {isStarted ? (
              <Button
                style={{
                  backgroundColor: `${
                    record._id !== selectedPallet?._id ? "" : "#fd1d32"
                  }`,
                  borderColor: `${
                    record._id !== selectedPallet?._id ? "" : "#fd1d32"
                  }`,
                  color: "white",
                }}
                onClick={() => {
                  setIsStarted(false);
                }}
                disabled={record._id !== selectedPallet?._id}
              >
                STOP
              </Button>
            ) : (
              <Button
                style={{
                  backgroundColor: "rgb(103 233 40)",
                  borderColor: "rgb(103 233 40)",
                  color: "white",
                }}
                disabled={isStarted}
                onClick={() => {
                  setIsStarted(true);
                  setSelectedPallet(record);
                }}
              >
                START
              </Button>
            )}
          </>
        );
      },
    },
  ];

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      let values: IPallet = await form.validateFields();
      values = {
        ...values,
        capacity: 20,
      };

      console.log("Values:", values);
      const res = await Pallet.createPallet(values);
      console.log("Pallet:", res);

      form.resetFields();
      setIsModalVisible(false);
      setLoading(true);

      setTimeout(() => {
        if (res.pallet) {
          message.success(`Pallet ${res.pallet.name} created successfully`);
        }
        setLoading(false);
      }, 3000);
    } catch (err: any) {
      console.log("Failed:", err);
      setErrorText(err.error);
    }
  };

  return (
    <div>
      <Breadcrumb
        style={{ margin: "16px 0" }}
        items={[
          {
            title: <a href="/">Dashboard</a>,
          },
          {
            title: <a href="/outbound-management">Outbound</a>,
          },
        ]}
      />
      <div className="d-flex flex-column border rounded p-2">
        <span className="fs-6 fw-bold">
          Current Active Pallet
          <span
            className="ms-2"
            style={{
              border: "1px solid green",
              borderRadius: "5px",
              color: "green",
              padding: "2px 5px",
            }}
          >
            Live
          </span>
        </span>
        <span className="pb-2" style={{ color: "grey" }}>
          Scanned parcels will be added to this pallet.
        </span>
        <span>pallet_id</span>
        <span>pallet_name</span>
        {outboundLoading ? <Spin /> : <span>Parcel Quantity:</span>}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            flexDirection: "column",
            color: "gray",
            fontSize: "12px",
          }}
        >
          <span>Last Updated:</span>
          <span>Last Fetched:</span>
        </div>
      </div>
      <h5 className="mt-2">
        Outbound Pallet Creation
        <Tooltip
          title="As a pallet is created the initial status is set to deactivated, after click on start, the status will be changed to activated.
        Scanning parcel will be added to the currently activated pallet."
          placement="bottom"
        >
          <InfoCircleOutlined style={{ marginLeft: "8px" }} />
        </Tooltip>
      </h5>
      <span style={{ color: "grey" }}></span>

      <Button
        className="my-2 me-2"
        type="primary"
        onClick={showModal}
        disabled={loading || isStarted}
      >
        {loading && <Spin className="me-2" />}
        Create a Pallet
      </Button>

      <Modal
        title={"Set Pallet Name"}
        open={isModalVisible}
        okText="Submit"
        onOk={handleSubmit}
        onCancel={() => {
          form.resetFields();
          setIsModalVisible(false);
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Pallet Name" name="name" required>
            <Input />
          </Form.Item>
        </Form>
        {errorText !== "" && (
          <div className="alert alert-danger my-2" role="alert">
            {errorText}
          </div>
        )}
      </Modal>

      <Table
        dataSource={pallets}
        columns={columns}
        // expandable={{
        //   expandedRowRender: (record) => {
        //     return (
        //       <>
        //         <p style={{ margin: 0 }}>{record.description}</p>
        //         <p style={{ margin: 0 }}>{record.description}</p>
        //       </>
        //     );
        //   },
        //   rowExpandable: (record) => record.name !== "Not Expandable",
        // }}
      />
    </div>
  );
};

export default OutboundManagement;