function rgb2gray(r, g, b) {
	return Math.round(r*0.299 + g*0.587 + b*0.114);
}

function D2B(number, length) {
	let binary_value = Number(number).toString(2);

	if(binary_value.length > length) {
		binary_value = getMSB(binary_value, length);
	}

	while(binary_value.length < length) {
		binary_value = "0" + binary_value;
	}
	return binary_value;
}

function B2D(bit_stream) {
	return parseInt(bit_stream, 2);
}

function getMSB(bit_stream, length) {
	return bit_stream.substring(0, length);
}

function getLSB(bit_stream, length) {
	return bit_stream.substring(bit_stream.length - length, bit_stream.length);
}

function fold(bit_stream, length) {
	while(bit_stream.length < 2*length) {
		let x = ["1", "1001", "10", "1000", "11", "111", "100", "0011", "101"];
		let index = bit_stream.length % x.length;
		bit_stream += x[index];
	}

	while(bit_stream.length % length != 0) {
		let x = "01101010001011";
		bit_stream += x.charAt((bit_stream.length * 3) % x.length);
	}

	let tmp_str = bit_stream.substring(0, length);
	let index = length;
	while(index < bit_stream.length) {
		let next_str = bit_stream.substring(index, index + length);
		let n = B2D(tmp_str) ^ B2D(next_str);
		tmp_str = D2B(n, length);
		index += length;
	}

	return tmp_str;
}