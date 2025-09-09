const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  addComment,
} = require("../controllers/ticketController");
const auth = require("../middleware/auth"); 

router.post("/", auth, createTicket);       
router.get("/", auth, getTickets);         
router.get("/:id", auth, getTicketById);   
router.put("/:id", auth, updateTicket);   
router.delete("/:id", auth, deleteTicket); 
router.post("/:id/comments", auth, addComment);


module.exports = router;
