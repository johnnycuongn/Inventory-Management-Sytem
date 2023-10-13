import {
  Dashboard,
  Items,
  Parcels,
  Sidebar,
  InboundPage,
  LoginPage,
  SignupPage,
  OutletPage,
  NewOrderPage,
  ProductDetails,
} from "./components";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Layout } from "antd";
import "./App.css";

const { Header, Content, Footer } = Layout;

const App = () => {
  const token = localStorage.getItem("token");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="*"
          element={
            token ? (
              <Layout style={{ minHeight: "100vh" }}>
                <Sidebar />
                <Layout>
                  <Header style={{ padding: 0, background: "#4796bd" }} />
                  <Content style={{ margin: "0 16px" }}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/parcels" element={<Parcels />} />
                      <Route path="/items" element={<Items />} />
                      <Route path="/items/:id" element={<ProductDetails />} />
                      <Route path="/inbound" element={<InboundPage />} />
                      <Route path="/outlet" element={<OutletPage />} />
                      <Route
                        path="/outlet/new-order"
                        element={<NewOrderPage />}
                      />
                    </Routes>
                  </Content>
                  <Footer
                    style={{
                      backgroundColor: "#4796bd",
                      textAlign: "center",
                      color: "#fff",
                      fontSize: "1.15em",
                    }}
                  >
                    IMS © 2023 Created by DC
                  </Footer>
                </Layout>
              </Layout>
            ) : (
              <Navigate to="/login" replace={true} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
