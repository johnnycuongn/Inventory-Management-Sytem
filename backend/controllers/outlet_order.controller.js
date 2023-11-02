const OutletOrder = require("../models/outlet_order.model");

const outletOrderController = {
  // Create new Outlet Order
  async create(req, res) {
    try {
      const user = req.user;
      const { description, status, products, datetimecreated } = req.body;
      console.log("User", user);
      const newOrder = new OutletOrder({
        user: user._id,
        description,
        status: status ?? "pending",
        products,
        datetimecreated: datetimecreated ?? new Date(),
      });

      const savedOrder = await newOrder.save();
      res.status(201).json(savedOrder);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Update existing Outlet Order
  async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      const { description, status, products, datetimecreated } = req.body;

      const updatedOrder = await OutletOrder.findByIdAndUpdate(
        id,
        { user, description, status, products, datetimecreated },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json(updatedOrder);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // // Update existing Outlet Order, but also update the inventory number of each product
  // Next Step:
  // async update(req, res) {
  //   let session;
  //   try {
  //     const { id } = req.params;
  //     const user = req.user;
  //     const { description, status, products, datetimecreated } = req.body;

  //     // Fetch the existing order
  //     const existingOrder = await OutletOrder.findById(id);

  //     if (!existingOrder) {
  //       return res.status(404).json({ error: "Order not found" });
  //     }

  //     // Check if the status is changing to 'processed' from 'pending' or 'accepted'
  //     if (["pending", "accepted"].includes(existingOrder.status) && status === "processed") {

  //       // ... your inventory checking and updating logic goes here
  //       const productIds = products.map(p => p.product);
  //       const inventories = await Inventory.find({ product: { $in: productIds } });

  //       // Check Inventory Levels
  //       for (let orderedProduct of products) {
  //         const inventoryItem = inventories.find(inv => inv.product.toString() === orderedProduct.product);

  //         if (!inventoryItem) {
  //           return res.status(400).json({ error: `Inventory for product ${orderedProduct.product} not found.` });
  //         }

  //         if (inventoryItem.parcel_quantity < orderedProduct.quantity) {
  //           return res.status(400).json({ error: `Not enough inventory for product ${orderedProduct.product}.` });
  //         }
  //       }

  //       // Start a session for atomic operations
  //       session = await mongoose.startSession();
  //       session.startTransaction();

  //       // Update inventory for each product
  //       for (let orderedProduct of products) {
  //         await Inventory.findOneAndUpdate(
  //           { product: orderedProduct.product },
  //           { $inc: { parcel_quantity: -orderedProduct.quantity } },
  //           { session }
  //         );
  //       }
  //     }

  //     // Update the order (This is outside the if block, so the order will be updated regardless of status change)
  //     const updatedOrder = await OutletOrder.findByIdAndUpdate(
  //       id,
  //       { user: user._id, description, status, products, datetimecreated },
  //       { new: true, session }
  //     );

  //     if (!updatedOrder) {
  //       if (session) {
  //         await session.abortTransaction();
  //         session.endSession();
  //       }
  //       return res.status(404).json({ error: "Order not found" });
  //     }

  //     if (session) {
  //       await session.commitTransaction();
  //       session.endSession();
  //     }

  //     res.status(200).json(updatedOrder);
  //   } catch (error) {
  //     if (session) {
  //       await session.abortTransaction();
  //       session.endSession();
  //     }
  //     res.status(400).json({ error: error.message });
  //   }
  // }

  // Get Single Outlet Order
  async getSingle(req, res) {
    try {
      const { id } = req.params;
      const order = await OutletOrder.findById(id)
        .populate("user")
        .populate("products.product");

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async getMany(req, res) {
    try {
      const orders = await OutletOrder.find()
        .populate("user")
        .populate("products.product")
        .sort({ datetimecreated: -1 });

      const transformedOrders = orders.map((order) => {
        const orderObject = order.toObject();
        orderObject.products = orderObject.products.map((productItem) => {
          if (typeof productItem.product.upc_data === "string") {
            try {
              // Parse the JSON string to JSON object
              productItem.product.upc_data = JSON.parse(
                productItem.product.upc_data
              );
            } catch (err) {
              console.error("Error parsing JSON string: ", err);
            }
          }
          return productItem;
        });
        return orderObject;
      });

      res.status(200).json(transformedOrders);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // Delete Outlet Order
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedOrder = await OutletOrder.findByIdAndDelete(id);

      if (!deletedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
};

module.exports = outletOrderController;
