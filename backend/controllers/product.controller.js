const Product = require("../models/product.model");
const Inventory = require("../models/inventory.model");
const { errorLogger } = require("../debug/debug");

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

    // TODO: Make API call to UPC database
    const upc_data = JSON.stringify({
      name: "Test Product",
      description: "This is a test product",
    });

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
    res.status(500).json({ status: "Error", error: error.message });
  }
};

module.exports = { createProduct };
