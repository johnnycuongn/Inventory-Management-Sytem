const Product = require("../models/product.model");
const Inventory = require("../models/inventory.model");
const Parcel = require("../models/parcel.model");

const { fetchUPCData } = require("../services/upc");

const { errorLogger } = require("../debug/debug");
const mongoose = require("mongoose");

const createProduct = async (req, res) => {
  try {
    const {
      barcode,
      datetimecreated = new Date(),
      datetimeupdated = new Date(),
    } = req.body;

    const productExist = await Product.findOne({ barcode });

    if (productExist)
      return res
        .status(201)
        .json({ message: "Product already exists", data: productExist });

    // Get product data from UPC API
    const data = await fetchUPCData(barcode);
    if (data.code.toLowerCase() !== "ok" && data.total !== 0) {
      return res.status(400).send({ message: "Invalid barcode" });
    }

    const upc_data = JSON.stringify(data.items[0]);

    // Create a new product
    const product = await Product.create({
      barcode,
      upc_data,
      datetimecreated,
      datetimeupdated,
    });

    // Create an inventory for the new product
    const inventory = await Inventory.create({
      product: product._id,
      parcel_quantity: 0,
      datetimecreated,
      datetimeupdated,
    });

    return res.status(200).json({
      status: "Success",
      item: product,
      inventory,
    });
  } catch (error) {
    errorLogger("product.controller", "createProduct").error({
      message: error,
    });
    res.status(400).json({ status: "Error", error: error.message });
  }
};

const getProduct = async (req, res) => {
  const id = req.params.id;

  console.log("Get product: ", id);
  let product = await Product.findById(id);

  if (!product) {
    product = await Product.findOne({ barcode: id });
    if (!product) {
      res.status(400).send({
        status: "Error",
        error: error.message,
        message: "Product not found",
      });
    }
  }

  let upc_json = {};
  if (product.upc_data) {
    upc_json = JSON.parse(product.upc_data);
  }

  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventory",
      },
    },
    {
      $unwind: {
        path: "$inventory",
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  try {
    const result = await Product.aggregate(pipeline);
    let result_product = result[0];
    result_product.upc_data = upc_json;
    res.status(200).json({
      status: "Success",
      product: result_product,
    });
  } catch (error) {
    errorLogger("product.controller", "getProduct").error({
      message: error,
    });
    res.status(500).json({
      status: "Error",
      error: error.message,
      message: "Unable to get product " + product._id,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const warehouseId = req.body.warehouse_id;

    if (!warehouseId) {
      return res
        .status(400)
        .send({ status: "Error", message: "Warehouse ID is required" });
    }

    const pipeline = [
      {
        $match: {
          // Filter by warehouse id
          warehouse: new mongoose.Types.ObjectId(warehouseId),
        },
      },
      {
        $group: {
          // Group the results by product ID to give you distinct product IDs.
          _id: "$product",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $lookup: {
          from: "inventories",
          localField: "product._id",
          foreignField: "product",
          as: "product.inventory",
        },
      },
      {
        $unwind: {
          path: "$product.inventory",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: {
          newRoot: "$product",
        },
      },
    ];

    try {
      let products = await Parcel.aggregate(pipeline);
      products = products.map((product) => {
        let upc_json = {};
        if (product.upc_data) {
          upc_json = JSON.parse(product.upc_data);
        }
        product.upc_data = upc_json;
        return product;
      });
      res.status(200).json({
        status: "Success",
        products,
      });
    } catch (error) {
      res
        .status(500)
        .send({ status: "Error", message: "Unable to get products." });
    }
  } catch (error) {
    console.error("Error:", error);
    errorLogger("product.controller", "getProducts").error({
      message: error,
    });
    res.status(500).send({
      status: "Error",
      error: error.message,
      message: "Internal Server Error",
    });
  }
};

module.exports = { createProduct, getProduct, getProducts };
