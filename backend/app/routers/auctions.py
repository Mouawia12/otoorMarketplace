from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models.user import User
from ..models.auction import Auction, Bid
from ..models.product import Product
from ..models.order import Order
from ..schemas.auction import AuctionCreate, AuctionResponse, AuctionWithBids, BidCreate, BidResponse

router = APIRouter(prefix="/auctions", tags=["auctions"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, auction_id: int):
        await websocket.accept()
        if auction_id not in self.active_connections:
            self.active_connections[auction_id] = []
        self.active_connections[auction_id].append(websocket)

    def disconnect(self, websocket: WebSocket, auction_id: int):
        if auction_id in self.active_connections:
            self.active_connections[auction_id].remove(websocket)

    async def broadcast(self, message: dict, auction_id: int):
        if auction_id in self.active_connections:
            for connection in self.active_connections[auction_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass


manager = ConnectionManager()


@router.get("", response_model=List[AuctionResponse])
def get_auctions(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Auction)
    
    if status:
        query = query.filter(Auction.status == status)
    
    auctions = query.offset((page - 1) * page_size).limit(page_size).all()
    return auctions


@router.get("/{auction_id}", response_model=AuctionWithBids)
def get_auction(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.get("/{auction_id}/pulse", response_model=AuctionWithBids)
def get_auction_pulse(auction_id: int, db: Session = Depends(get_db)):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("/{auction_id}/bid", response_model=BidResponse)
async def place_bid(
    auction_id: int,
    bid_data: BidCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auction = db.query(Auction).filter(Auction.id == auction_id).first()
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    
    now = datetime.utcnow()
    if now < auction.start_at:
        raise HTTPException(status_code=400, detail="Auction has not started yet")
    if now > auction.end_at:
        raise HTTPException(status_code=400, detail="Auction has ended")
    
    if bid_data.amount < auction.current_price + auction.min_increment:
        raise HTTPException(
            status_code=400,
            detail=f"Bid must be at least {auction.current_price + auction.min_increment}"
        )
    
    new_bid = Bid(
        auction_id=auction_id,
        user_id=current_user.id,
        amount=bid_data.amount
    )
    
    auction.current_price = bid_data.amount
    
    db.add(new_bid)
    db.commit()
    db.refresh(new_bid)
    
    await manager.broadcast({
        "type": "new_bid",
        "auction_id": auction_id,
        "current_price": auction.current_price,
        "bid_count": len(auction.bids),
        "latest_bid": {
            "amount": new_bid.amount,
            "user_id": new_bid.user_id,
            "created_at": new_bid.created_at.isoformat()
        }
    }, auction_id)
    
    return new_bid


@router.websocket("/ws/auctions/{auction_id}")
async def websocket_endpoint(websocket: WebSocket, auction_id: int):
    await manager.connect(websocket, auction_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, auction_id)


@router.post("", response_model=AuctionResponse)
def create_auction(
    auction_data: AuctionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == auction_data.product_id,
        Product.seller_id == current_user.id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.type = "auction"
    
    new_auction = Auction(
        product_id=auction_data.product_id,
        start_price=auction_data.start_price,
        min_increment=auction_data.min_increment,
        start_at=auction_data.start_at,
        end_at=auction_data.end_at,
        current_price=auction_data.start_price,
        status="scheduled"
    )
    
    db.add(new_auction)
    db.commit()
    db.refresh(new_auction)
    
    return new_auction
