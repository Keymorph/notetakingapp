import { createTheme } from "@mui/system";

const appTheme = createTheme({
  components: {
    Button: {
      primary: {
        backgroundColor: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
        boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
        border: 0,
        borderRadius: 20,
      },
      secondary: {
        backgroundColor: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
        boxShadow: "0 3px 5px 2px rgba(255, 105, 135, .3)",
        border: 0,
        borderRadius: 20,
      },
    },
  },
});

export default appTheme;
