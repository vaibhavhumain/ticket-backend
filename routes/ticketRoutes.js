const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} = require("../controllers/ticketController");
const auth = require("../middleware/auth"); 

router.post("/", auth, createTicket);       
router.get("/", auth, getTickets);         
router.get("/:id", auth, getTicketById);   
router.put("/:id", auth, updateTicket);   
router.delete("/:id", auth, deleteTicket); 

module.exports = router;
