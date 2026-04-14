import hashlib

def create_payment_generate_hash(params, salt):
    # Extract parameters or use empty string if not provided
    key = params['key']
    txnid = params['txnid']
    amount = params['amount']
    productinfo = params['productinfo']
    firstname = params['firstname']
    email = params['email']
    udf1 = params.get('udf1', '')
    udf2 = params.get('udf2', '')
    udf3 = params.get('udf3', '')
    udf4 = params.get('udf4', '')
    udf5 = params.get('udf5', '')
    
    # Construct hash string with exact parameter sequence
    hash_string = f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|{udf1}|{udf2}|{udf3}|{udf4}|{udf5}||||||{salt}"
    
    # Generate SHA-512 hash
    return hashlib.sha512(hash_string.encode('utf-8')).hexdigest()


def verify_payment_generate_hash(params, salt):
    # Extract parameters or use empty string if not provided
    key = params['key']
    txnid = params['txnid']
    command = params['command']
    
    hash_string = f"{key}|{command}|{txnid}|{salt}"
    return hashlib.sha512(hash_string.encode('utf-8')).hexdigest()