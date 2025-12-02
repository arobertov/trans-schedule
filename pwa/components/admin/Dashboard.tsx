import * as React from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import WorkIcon from "@mui/icons-material/Work";
import PersonIcon from "@mui/icons-material/Person";
import AddIcon from "@mui/icons-material/Add";

export const Dashboard = () => {
  const handleNavigate = (path: string) => {
    // Extract hash part from path (e.g., "/admin#/users" -> "#/users")
    const hash = path.split('#')[1];
    if (hash) {
      window.location.hash = hash;
    }
  };

  const cards = [
    {
      title: "Служители",
      description: "Преглед и управление на служители",
      icon: <PeopleIcon sx={{ fontSize: 60 }} />,
      color: "#1976d2",
      viewPath: "/admin#/employees",
      addPath: "/admin#/employees/create",
    },
    {
      title: "Позиции",
      description: "Преглед и управление на позиции",
      icon: <WorkIcon sx={{ fontSize: 60 }} />,
      color: "#2e7d32",
      viewPath: "/admin#/positions",
      addPath: "/admin#/positions/create",
    },
    {
      title: "Потребители",
      description: "Преглед и управление на потребители",
      icon: <PersonIcon sx={{ fontSize: 60 }} />,
      color: "#ed6c02",
      viewPath: "/admin#/users",
      addPath: "/admin#/users/create",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Табло за управление
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Добре дошли в административния панел
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                <Box
                  sx={{
                    color: card.color,
                    mb: 2,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h5" component="h2" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleNavigate(card.viewPath)}
                >
                  Преглед
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleNavigate(card.addPath)}
                  sx={{ bgcolor: card.color }}
                >
                  Добави
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
